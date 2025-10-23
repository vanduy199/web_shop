from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from fastapi import Request

from app.core.config import SessionLocal
from app.core.security import decode_access_token
from app.crud import user as user_crud
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends
from app.models.user import User

from app.repositories import user_repository as user_repo

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Dependency get DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Lấy user từ token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = user_repo.get_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user

# Yêu cầu quyền admin
def require_admin(current_user=Depends(get_current_user)):
    if (current_user.role or '').lower() != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return current_user

# ... phần import và hàm get_current_user() có sẵn

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

def generate_guest_token():
    payload = {
        "sub": "99999999",
        "role": "guest",
        "exp": datetime.utcnow() + timedelta(days=365)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
# --- Cho phép route hoạt động khi không cần đăng nhập ---
def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional["User"]:
    """
    Cho phép route hoạt động cả khi không đăng nhập.
    Nếu có token hợp lệ → trả về User.
    Nếu không có token hoặc token sai → trả về None (ẩn danh).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None  # Không có token → khách ẩn danh

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = user_crud.get_user_by_id(db, user_id)
    return user