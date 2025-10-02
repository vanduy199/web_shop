from fastapi import  APIRouter, HTTPException, Depends
from app.core.config import SessionLocal
from app.models.user_activity import UserActivity
from app.schemas.user_activity import UserActivitySchema, InputUserActivity
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
def post_activity(a: InputUserActivity,db: Session = Depends(get_db)):
    user_ac = []
    for i in a.activities:
        x = UserActivity(**i.model_dump())
        user_ac.append(x)
    db.add_all(user_ac)
    db.commit()
    return {
        "message" : "ok"
    }
@router.get("/",response_model=List[UserActivitySchema])
def get_user_activity(id: Optional[int] = None, db: Session = Depends(get_db)):
    if not id:
        data = db.query(UserActivity).all()
    else:
        data = db.query(UserActivity).filter(UserActivity.user_id == id).all()
    return data

    
