from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserActivitySchema(BaseModel):
    user_id : int
    product_id: int
    action: str
    created_at: Optional[datetime] = None

class InputUserActivity(BaseModel):
    activities : List[UserActivitySchema]
