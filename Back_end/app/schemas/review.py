from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ReviewCreate(BaseModel):
    product_id: int
    rating: Optional[int] = None
    comment: Optional[str] = None
    id_parent: Optional[int] = None


class Response(BaseModel):
    product_id: Optional[int] = None
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    comment_children: List[Response] = []

    class Config:
        orm_mode = True
