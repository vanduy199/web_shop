from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.models.banners import Banner
from app.schemas.banners import BannerOut
from sqlalchemy import text
router = APIRouter(prefix="/banners", tags=["Banners (public)"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/raw")
def read_public_banners_raw(db: Session = Depends(get_db)):
    query = text("SELECT * FROM banners WHERE position IS NOT NULL")
    result = db.execute(query)
    return result.mappings().all()
