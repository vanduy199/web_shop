from fastapi import  APIRouter, HTTPException, Depends
from app.core.config import SessionLocal
from app.models.user_activity import UserActivity
from app.models.user import User
from app.services.authentication import get_current_user, require_admin
from app.schemas.user_activity import UserActivitySchema, OutActivity
from sqlalchemy.orm import Session
from typing import List, Optional
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.post("/")
def post_activity(a: UserActivitySchema,db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    x = UserActivity(
        user_id = current_user.id,
        product_id = a.product_id,
        action = a.action
    )
    db.add(x)
    db.commit()
    return {
        "message" : "ok"
    }
@router.get("/",response_model=List[OutActivity])
def get_user_activity(db: Session = Depends(get_db),current_user: User = Depends(require_admin)):
    data = db.query(UserActivity).all()
    return data

    
