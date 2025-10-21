from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- 1. SCHEMAS CHO INPUT (Gửi Form & Admin Phản hồi) ---

class SupportTicketSubmission(BaseModel):
    """dữ liệu văn bản gửi từ form Hỗ trợ (Client-Side)."""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    
    issue_type: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class SupportMessageCreate(BaseModel):
    """phản hồi mới của Admin."""
    message: str = Field(..., description="Nội dung phản hồi")
    attachment_url: Optional[str] = None
    
class TicketUpdate(BaseModel):
    """Admin cập nhật trạng thái/ưu tiên của Ticket."""
    status: Optional[str] = None
    priority: Optional[str] = None

# --- 2. SCHEMAS CHO OUTPUT (Admin View và Chi tiết) ---

class SupportTicketResponse(BaseModel):
    """phản hồi TÓM TẮT khi gửi yêu cầu thành công (Cho Client)."""
    message: str 
    attachment_url: Optional[str] = None
    

class SupportMessageDetail(BaseModel):
    """chi tiết của một tin nhắn trong chuỗi hội thoại (Dùng cho Admin)."""
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
    """mô tả thông tin quản lý và người gửi ."""
    id: int
    user_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    subject: str
    issue_type: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    
    # THÔNG TIN NGƯỜI GỬI (Đồng bộ với Model)
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_phone: Optional[str] = None
    
    class Config:
        from_attributes = True

class FullTicketDetail(BaseModel):
    """Schema CHI TIẾT ĐẦY ĐỦ: Gồm thông tin quản lý VÀ toàn bộ lịch sử tin nhắn."""
    detail: Optional[TicketDetailSchema] = None
    messages: List[str] = []
    attachment_urls: list[str] = []
    
    class Config:
        from_attributes = True
class TicketSummary(BaseModel):
    """
    Dùng cho danh sách: không chứa messages/attachment_urls
    """
    id: int
    created_at: Optional[datetime] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    status: str
    priority: Optional[str] = None

    class Config:
        from_attributes = True