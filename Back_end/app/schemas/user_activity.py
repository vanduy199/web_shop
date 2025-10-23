from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserActivitySchema(BaseModel):
    product_id: int
    action: str
    created_at: Optional[datetime] = None

class OutActivity(BaseModel):
    user_id: int
    product_id: int
    action: str
    created_at: Optional[datetime] = None