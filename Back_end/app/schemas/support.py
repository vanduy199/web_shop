from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- 1. SCHEMAS CHO INPUT (Gửi Form & Admin Phản hồi) ---

class SupportTicketSubmission(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    
    issue_type: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class SupportMessageCreate(BaseModel):
    message: str = Field(..., description="Nội dung phản hồi")
    attachment_url: Optional[str] = None
    
class TicketUpdate(BaseModel):
  
    status: Optional[str] = None
    priority: Optional[str] = None

# --- 2. SCHEMAS CHO OUTPUT (Admin View và Chi tiết) ---

class SupportTicketResponse(BaseModel):
    message: str 
    attachment_url: Optional[str] = None
    
class SupportMessageDetail(BaseModel):
    id: int
    ticket_id: int
    sender_id: Optional[int] = None
    sender_type: str = Field(..., description="'Customer' hoặc 'Agent'")
    message: str
    attachment_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

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