from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.schemas.user import UserCreate, UserOut, UserUpdate, ChangePasswordSchema
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["Users"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return user_service.register_user(db, user)

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(user_service.User).filter(user_service.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    return user_service.update_user_info(db, user_id, user_update)

@router.put("/{user_id}/change-password")
def change_password(user_id: int, data: ChangePasswordSchema, db: Session = Depends(get_db)):
    return user_service.change_password(db, user_id, data)