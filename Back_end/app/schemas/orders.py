from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float


class OrderItemResponse(OrderItemBase):
    id: int
    product_name: Optional[str]
    product_thumb: Optional[str]

    class Config:
        orm_mode = True


class OrderBase(BaseModel):
    user_id: int
    total_price: float
    status: str = "Đang xử lý"


class OrderResponse(OrderBase):
    id: int
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        orm_mode = True
