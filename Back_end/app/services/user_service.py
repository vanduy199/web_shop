from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.crud import user as user_crud
from app.schemas import UserCreate, UserUpdate, ChangePasswordSchema
from app.models.user import User

def register_user(db: Session, user_data: UserCreate) -> User:
    existing = user_crud.get_user_by_phone(db, user_data.phone)
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    return user_crud.create_user(db, user_data)

def update_user_info(db: Session, user_id: int, user_update: UserUpdate) -> User:
    db_user = user_crud.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_crud.update_user(db, db_user, user_update)


def change_password(db: Session, user_id: int, data: ChangePasswordSchema):
    db_user = user_crud.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user_crud.verify_password(data.old_password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password incorrect")

    db_user.password_hash = user_crud.get_password_hash(data.new_password)
    db.commit()
    db.refresh(db_user)
    return {"message": "Password updated successfully"}
