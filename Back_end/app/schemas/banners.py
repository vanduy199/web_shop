# ...existing code...
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# --- BASE/CREATE SCHEMA ---
class BannerBase(BaseModel):
    title: Optional[str] = Field(None, description="Tiêu đề banner")
    image_url: Optional[str] = Field(None, description="URL của ảnh banner")
    link: Optional[str] = Field(None, description="Liên kết đích khi click vào banner")
    position: Optional[str] = Field(None, description="Vị trí hiển thị (e.g., 'homepage_top')")
    start_time: Optional[datetime] = Field(None)
    end_time: Optional[datetime] = Field(None)
    active: Optional[bool] = Field(True)

class BannerCreate(BannerBase):
    pass

# --- UPDATE SCHEMA ---
class BannerUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    position: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    active: Optional[bool] = None

# --- OUTPUT SCHEMA ---
class BannerOut(BannerBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
