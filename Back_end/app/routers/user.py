from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.schemas.user import UserCreate, UserOut, UserUpdate, ChangePasswordSchema, OutPutUser
from app.services import user as user_service
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User 
from app.crud import user as user_crud

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
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    return user_crud.get_user_by_id(db, user_id)

@router.get("/users/me", response_model=OutPutUser)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    return user_service.update_user_info(db, user_id, user_update)


@router.put("/{user_id}/change-password")
def change_password(
    user_id: int,
    data: ChangePasswordSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to change this password")
    return user_service.change_password(db, user_id, data)