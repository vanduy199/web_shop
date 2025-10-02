from datetime import timedelta
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas import LoginSchema, TokenSchema, TokenData
from app.crud import user as user_crud
from app.models.user import User
from app.core.config import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def authenticate_user(db: Session, phone: str, password: str):
    user = user_crud.get_user_by_phone(db, phone)
    if not user:
        return None
    if not user_crud.verify_password(password, user.password_hash):
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
