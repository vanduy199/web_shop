from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# ====================== SCHEMA CHO OrderItem ======================
class OrderItemBase(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    product_name: Optional[str] = None
    product_thumb: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ====================== SCHEMA CHO Order ======================
class OrderBase(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    created_at: datetime
    items: List[OrderItemBase] = []

    model_config = ConfigDict(from_attributes=True)


# ====================== SCHEMA TRẢ VỀ ======================
class OrderResponse(OrderBase):
    """
    Schema chuẩn trả về cho API /orders/{user_id} và /orders POST
    """
    pass
