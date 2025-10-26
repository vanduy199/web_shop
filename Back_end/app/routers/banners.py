# ...existing code...
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from uuid import uuid4
from pathlib import Path

from app.core.config import SessionLocal  # dùng SessionLocal từ config
from app.schemas.banners import BannerCreate, BannerUpdate, BannerOut

# simple get_db dependency (close session after use)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# TODO: thay bằng dependency xác thực thực tế của bạn
async def get_current_admin():
    # Nếu dùng auth: kiểm tra token/role ở đây
    return True

router = APIRouter(prefix="/admin/banners", tags=["Admin Banners"])

# folder lưu ảnh (tạo nếu chưa có)
BANNERS_DIR = Path(__file__).resolve().parents[2] / "static" / "banners"
os.makedirs(BANNERS_DIR, exist_ok=True)

# ========== GET: danh sách ==========
@router.get("/", response_model=List[BannerOut])
def read_banners(
    db: Session = Depends(get_db),
    position: Optional[str] = None,
    banner_position: Optional[str] = None,  # hỗ trợ param từ frontend nếu dùng banner_position
    is_admin: bool = Depends(get_current_admin)
):
    p = position or banner_position
    q = db.query(Banner)
    if p:
        q = q.filter(Banner.position == p)
    return q.all()

# ========== POST: tạo banner (hỗ trợ upload file hoặc url) ==========
@router.post("/", response_model=BannerOut, status_code=status.HTTP_201_CREATED)
def create_banner(
    title: str = Form(...),
    position: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    active: Optional[bool] = Form(True),
    image_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    # ưu tiên file upload, nếu không có thì dùng image_url
    final_image_url = None
    if file:
        ext = Path(file.filename).suffix or ".jpg"
        filename = f"{uuid4().hex}{ext}"
        dest = BANNERS_DIR / filename
        with open(dest, "wb") as f:
            f.write(file.file.read())
        final_image_url = f"/static/banners/{filename}"
    elif image_url:
        final_image_url = image_url

    banner = Banner(
        title=title,
        position=position,
        link=link,
        active=bool(active),
        image_url=final_image_url
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner

# ========== PUT: cập nhật ==========
@router.put("/{banner_id}", response_model=BannerOut)
def update_banner(
    banner_id: int,
    payload: BannerUpdate,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    # payload có thể là Pydantic v2 model -> model_dump
    data = {}
    try:
        data = payload.model_dump(exclude_unset=True)
    except Exception:
        # fallback cho pydantic v1 style
        data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b

# ========== DELETE ==========
@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    # xóa file ảnh nếu image_url trỏ tới static path
    if b.image_url:
        try:
            rel = b.image_url.lstrip("/")
            p = Path(__file__).resolve().parents[2] / rel
            if p.exists():
                p.unlink()
        except Exception:
            pass
    db.delete(b)
    db.commit()
    return None
