from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    product_id: int
    rating: int
    comment: Optional[str] = None
