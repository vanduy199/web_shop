from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BannerBase(BaseModel):
    title: Optional[str] = Field(None, description="Tiêu đề banner")
    image_url: Optional[str] = Field(None, description="Đường dẫn ảnh banner")
    link_url: Optional[str] = Field(None, description="Liên kết khi click vào banner")
    position: Optional[str] = Field(None, description="Vị trí hiển thị banner")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = Field(True, description="Trạng thái hiển thị")

class BannerCreate(BannerBase):
    pass

class BannerUpdate(BannerBase):
    pass

class BannerOut(BannerBase):
    id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
