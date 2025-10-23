from datetime import date
from re import S
from time import time
from typing import Optional, List
from datetime import datetime
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
    payment_method: Optional[str] = None
    shipping_address: Optional[str] = None
    phone_number: Optional[str] = None
    items: List[OrderItemBase] = []

    model_config = ConfigDict(from_attributes=True)


# ====================== SCHEMA TRẢ VỀ ======================
class OrderResponse(OrderBase):
    """
    Schema chuẩn trả về cho API /orders/{user_id} và /orders POST
    """
    pass

class OrderInput(BaseModel):
    carts: str
    address: str
    pttt: str
    phone: str
