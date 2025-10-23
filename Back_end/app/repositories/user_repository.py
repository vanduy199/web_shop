from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def get_by_phone(db: Session, phone: str) -> Optional[User]:
    return db.query(User).filter(User.phone == phone).first()


def get_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create(db: Session, user: UserCreate) -> User:
    hashed_pw = hash_password(user.password)
    db_user = User(
        username=user.phone,
        phone=user.phone,
        password_hash=hashed_pw,
        full_name=user.full_name,
        email=user.email,
        role="USER",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


essential_update_fields = {"full_name", "email"}

def update(db: Session, db_user: User, user_update: UserUpdate) -> User:
    data = user_update.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete(db: Session, db_user: User) -> None:
    db.delete(db_user)
    db.commit()


def list_all(db: Session, sort_by: str = "full_name", order: str = "asc") -> list[User]:
    # Map friendly names to columns
    column_map = {
        "name": "full_name",
        "full_name": "full_name",
        "created_at": "created_at",
        "updated_at": "updated_at",  # only if exists on model
    }
    col_name = column_map.get(sort_by, sort_by)
    # Fallback to full_name if attribute missing
    sort_col = getattr(User, col_name, User.full_name)
    ordering = sort_col.desc() if str(order).lower() == "desc" else sort_col.asc()
    return db.query(User).order_by(ordering).all()
