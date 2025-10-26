from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.models.banners import Banner
from app.schemas.banners import BannerOut

router = APIRouter(prefix="/banners", tags=["Banners (public)"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[BannerOut])
def read_public_banners(
    position: Optional[str] = None,
    banner_position: Optional[str] = None,
    db: Session = Depends(get_db)
):
    p = position or banner_position
    q = db.query(Banner).filter(Banner.active == True)
    if p:
        q = q.filter(Banner.position == p)
    return q.all()