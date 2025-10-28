from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from app.schemas.user import UserCreate, UserUpdate, ChangePasswordSchema
from app.models.user import User
from app.models.orders import Order
from sqlalchemy import func

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Các hàm cơ bản tương tác với DB (có thể tách ra package khác nhưng để đây để đồng bộ với nhóm):
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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

def update(db: Session, db_user: User, user_update: UserUpdate) -> User:
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete(db: Session, db_user: User) -> None:
    db.delete(db_user)
    db.commit()
    
# Các hàm service phục vụ router

def list_all(db: Session, sort_by: str = "name", order: str = "asc") -> List[User]:
    attr_map = {
        "name": "username",
        "full_name": "full_name",
        "created_at": "created_at",
        "updated_at": "updated_at",
    }
    sort_attr_name = attr_map.get((sort_by or "").lower())
    if (sort_by or "").lower() == "orders_count":
        counts_subq = (
            db.query(Order.user_id.label("user_id"), func.count(Order.id).label("orders_count"))
            .group_by(Order.user_id)
            .subquery()
        )
        query = db.query(User).outerjoin(counts_subq, counts_subq.c.user_id == User.id)
        order_by_expr = counts_subq.c.orders_count.desc() if (order or "asc").lower() == "desc" else counts_subq.c.orders_count.asc()
        return query.order_by(order_by_expr, User.id.asc()).all()

    if not sort_attr_name:
        raise HTTPException(status_code=400, detail="Invalid sort_by")
    if sort_attr_name == "updated_at" and not hasattr(User, "updated_at"):
        raise HTTPException(status_code=400, detail="Sorting by updated_at is not supported")

    sort_attr = getattr(User, sort_attr_name)
    query = db.query(User)
    query = query.order_by(sort_attr.asc() if (order or "asc").lower() == "asc" else sort_attr.desc())
    return query.all()

def register_user(db: Session, user_data: UserCreate) -> User:
    existing = get_by_phone(db, user_data.phone)
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    return create(db, user_data)

def update_user_info(db: Session, user_id: int, user_update: UserUpdate) -> User:
    db_user = get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return update(db, db_user, user_update)


def change_password(db: Session, user_id: int, data: ChangePasswordSchema):
    db_user = get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(data.old_password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password incorrect")

    db_user.password_hash = hash_password(data.new_password)
    db.commit()
    db.refresh(db_user)
    return {"message": "Password updated successfully"}


def get_user_by_id(db: Session, user_id: int) -> User:
    user = get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def list_users(db: Session, sort_by: str = "name", order: str = "asc") -> List[Dict[str, Any]]:
    sort_by_norm = (sort_by or "").lower()
    order_norm = (order or "asc").lower()
    allowed = {"name", "full_name", "created_at", "updated_at", "orders_count"}
    if sort_by_norm not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by. Allowed: {', '.join(sorted(allowed))}")
    if order_norm not in {"asc", "desc"}:
        raise HTTPException(status_code=400, detail="Invalid order. Use 'asc' or 'desc'")

    users = list_all(db, sort_by=sort_by_norm, order=order_norm)

    counts = dict(
        db.query(Order.user_id, func.count(Order.id)).group_by(Order.user_id).all()
    )

    result: List[Dict[str, Any]] = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "phone": u.phone,
            "full_name": u.full_name,
            "email": u.email,
            "role": getattr(u, "role", None),
            "created_at": getattr(u, "created_at", None),
            "orders_count": int(counts.get(u.id, 0)),
        })
    return result