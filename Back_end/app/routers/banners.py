from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4
from pathlib import Path
import shutil

from app.core.config import SessionLocal
from app.schemas.banners import BannerCreate, BannerUpdate, BannerOut
from app.models.banners import Banner

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# simple admin guard (replace with real auth dependency if available)
async def get_current_admin():
    # TODO: replace with real admin check
    return True

router = APIRouter(prefix="/admin/banners", tags=["Admin Banners"])
public_router = APIRouter(prefix="/banners", tags=["Public Banners"])

BANNERS_DIR = Path(__file__).resolve().parents[1] / "static" / "banners"
BANNERS_DIR.mkdir(parents=True, exist_ok=True)

def make_absolute_url(request: Request, path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    p = str(path).strip()
    if p.startswith("http://") or p.startswith("https://"):
        return p
    # ensure leading slash
    if not p.startswith("/"):
        p = "/" + p
    return str(request.base_url).rstrip("/") + p

@router.get("/", response_model=List[BannerOut])
def read_banners(
    db: Session = Depends(get_db),
    position: Optional[str] = None,
    banner_position: Optional[str] = None,
    is_admin: bool = Depends(get_current_admin)
):
    p = position or banner_position
    q = db.query(Banner)
    if p:
        q = q.filter(Banner.position == p)
    return q.all()

@public_router.get("/", response_model=List[BannerOut])
def read_public_banners(
    request: Request,
    db: Session = Depends(get_db),
    position: Optional[str] = None,
    banner_position: Optional[str] = None
):
    p = position or banner_position
    q = db.query(Banner).filter(Banner.is_active == True)
    if p:
        q = q.filter(Banner.position == p)
    results = q.all()
    # convert image_url to absolute URL for frontend convenience
    out = []
    for b in results:
        item = {
            "id": b.id,
            "title": b.title,
            "image_url": make_absolute_url(request, b.image_url),
            "link_url": b.link_url if hasattr(b, "link_url") else None,
            "position": b.position,
            "is_active": getattr(b, "is_active", getattr(b, "active", True)),
            "created_at": getattr(b, "created_at", None),
            "updated_at": getattr(b, "updated_at", None)
        }
        out.append(item)
    return out

@router.post("/", response_model=BannerOut, status_code=201)
def create_banner(
    request: Request,
    title: Optional[str] = Form(None),
    position: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    is_active_str: Optional[str] = Form("true"),
    image_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    is_active = str(is_active_str).lower() in ("1","true","yes")
    final_image_rel = None
    if file:
        ext = Path(file.filename).suffix or ".jpg"
        filename = f"{uuid4().hex}{ext}"
        dest = BANNERS_DIR / filename
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        final_image_rel = f"/static/banners/{filename}"
    elif image_url:
        final_image_rel = image_url

    banner = Banner(
        title=title,
        position=position,
        link_url=link_url,
        is_active=is_active,
        image_url=final_image_rel
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)

    # Return object with absolute image_url
    banner.image_url = make_absolute_url(request, banner.image_url)
    return banner

@router.put("/{banner_id}", response_model=BannerOut)
def update_banner(
    request: Request,
    banner_id: int,
    payload: BannerUpdate,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    # ensure returned image_url is absolute
    b.image_url = make_absolute_url(request, b.image_url)
    return b

@router.delete("/{banner_id}", status_code=204)
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    # delete physical file only if stored under static/banners
    if b.image_url and str(b.image_url).startswith("/static/banners/"):
        try:
            p = Path(__file__).resolve().parents[1] / b.image_url.lstrip("/")
            if p.exists():
                p.unlink()
        except Exception:
            pass
    db.delete(b)
    db.commit()
    return None