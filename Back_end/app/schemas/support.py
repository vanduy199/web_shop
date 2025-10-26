from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None


class SupportTicketResponse(BaseModel):
    message: str 
    attachment_url: Optional[str] = None
    
class TicketDetailSchema(BaseModel):
    id: int
    user_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    subject: str
    issue_type: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    
    requester_name: Optional[str] = None
    requester_email: Optional[EmailStr] = None
    requester_phone: Optional[str] = None
    
    class Config:
        from_attributes = True

class FullTicketDetail(BaseModel):
    detail: Optional[TicketDetailSchema] = None
    messages: List[str] = []
    attachment_urls: list[str] = []
    
    class Config:
        from_attributes = True
class TicketSummary(BaseModel):
    id: int
    created_at: Optional[datetime] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    status: str
    priority: Optional[str] = None

    class Config:
        from_attributes = True