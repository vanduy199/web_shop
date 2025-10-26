from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from jose import jwt

from app.core.security import (
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    decode_access_token,
    SECRET_KEY,
    ALGORITHM,
)
from app.schemas import LoginSchema, TokenSchema, TokenData
from app.services.user import get_by_phone, verify_password
from app.models.user import User
from app.core.config import SessionLocal

# OAuth2 bearer scheme for extracting token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def authenticate_user(db: Session, phone: str, password: str):
    user = get_by_phone(db, phone)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def login_for_access_token(db: Session, form_data: LoginSchema) -> TokenSchema:
    user = authenticate_user(db, form_data.phone, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    return TokenSchema(access_token=access_token, token_type="bearer")


# --- Moved from app.dependencies.auth ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Lazy import to avoid circular dependency on service function
    from app.services.user import get_by_id

    user = get_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return current_user


def generate_guest_token() -> str:
    payload = {
        "sub": "0",
        "role": "guest",
        "exp": datetime.utcnow() + timedelta(days=365),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Allow route to work without login; return User if valid token else None."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    from app.services.user import get_by_id

    user = get_by_id(db, user_id)
    return user
