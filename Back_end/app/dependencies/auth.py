from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import SessionLocal
from app.core.security import decode_access_token
from app.crud import user as user_crud

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

    user = user_crud.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user

# Yêu cầu quyền admin
def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return current_user
