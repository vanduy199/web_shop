from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.product import ProductSchema 


class CartBase(BaseModel):
    product_id: int
    quantity: int = 1
    selected: bool = True   # ✅ thêm thuộc tính chọn/bỏ chọn


class CartCreate(CartBase):
    pass


class CartUpdate(BaseModel):
    quantity: Optional[int] = None
    selected: Optional[bool] = None  # ✅ cho phép cập nhật trạng thái chọn


class CartInDBBase(CartBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartResponse(CartInDBBase):
    product: Optional[ProductSchema] = None
