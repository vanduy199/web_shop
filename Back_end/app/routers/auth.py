from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.user import LoginSchema, TokenSchema
from Back_end.app.services import auth
from app.core.config import SessionLocal

router = APIRouter(prefix="", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login", response_model=TokenSchema)
def login(form_data: LoginSchema, db: Session = Depends(get_db)):
    return auth.login_for_access_token(db, form_data)
