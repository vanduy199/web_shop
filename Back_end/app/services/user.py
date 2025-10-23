from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories import user_repository as user_repo
from app.schemas.user import UserCreate, UserUpdate, ChangePasswordSchema
from app.models.user import User

def register_user(db: Session, user_data: UserCreate) -> User:
    existing = user_repo.get_by_phone(db, user_data.phone)
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    return user_repo.create(db, user_data)

def update_user_info(db: Session, user_id: int, user_update: UserUpdate) -> User:
    db_user = user_repo.get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_repo.update(db, db_user, user_update)


def change_password(db: Session, user_id: int, data: ChangePasswordSchema):
    db_user = user_repo.get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user_repo.verify_password(data.old_password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password incorrect")

    db_user.password_hash = user_repo.hash_password(data.new_password)
    db.commit()
    db.refresh(db_user)
    return {"message": "Password updated successfully"}


def get_user_by_id(db: Session, user_id: int) -> User:
    user = user_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def list_users(db: Session, sort_by: str = "name", order: str = "asc") -> list[User]:
    sort_by = (sort_by or "").lower()
    order = (order or "asc").lower()
    allowed = {"name", "full_name", "created_at", "updated_at"}
    if sort_by not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by. Allowed: {', '.join(sorted(allowed))}")
    # If updated_at not on model, reject
    if sort_by == "updated_at" and not hasattr(User, "updated_at"):
        raise HTTPException(status_code=400, detail="Sorting by updated_at is not supported")
    if order not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="Invalid order. Use 'asc' or 'desc'")
    return user_repo.list_all(db, sort_by=sort_by, order=order)