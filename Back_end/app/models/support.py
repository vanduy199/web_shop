from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.config import Base # Giả định Base được import

class SupportMessageModel(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # FK1: Trỏ đến Ticket chính
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=True)
    # FK2: Trỏ đến User (sender) - Cho phép NULL nếu ẩn danh
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True) 

    sender_type = Column(String(10), nullable=False) # 'Customer' hoặc 'Agent'
    message = Column(String, nullable=True) 
    attachment_url = Column(String(255), nullable=True) 
    created_at = Column(DateTime, server_default=func.now())

    # --- RELATIONSHIPS TRONG MESSAGE ---
    ticket = relationship(
        "SupportTicketModel", 
        back_populates="messages",
        foreign_keys="[SupportMessageModel.ticket_id]"
    )
    sender = relationship("User", foreign_keys="[SupportMessageModel.sender_id]", back_populates="sent_messages") 


class SupportTicketModel(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # FK1: Người gửi yêu cầu - Cho phép NULL nếu ẩn danh
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    # FK2: Nhân viên được giao
    assigned_to_id = Column(Integer, nullable=True)
    # FK3: Tin nhắn đầu tiên
    first_message_id = Column(Integer, ForeignKey("support_messages.id"), nullable=True) 

    subject = Column(String(255), nullable=False)
    issue_type = Column(String(50), nullable=False, default='Khác')
    status = Column(String(20), nullable=False, default='New')
    priority = Column(String(20), nullable=False, default='Medium')
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- CÁC CỘT THÔNG TIN NGƯỜI GỬI (KHẮC PHỤC LỖI NULL) ---
    requester_name = Column(String(255), nullable=True) 
    requester_email = Column(String(255), nullable=True) 
    requester_phone = Column(String(20), nullable=True)

    # --- RELATIONSHIPS TRONG TICKET ---
    messages = relationship(
        "SupportMessageModel", 
        back_populates="ticket",
        foreign_keys="[SupportMessageModel.ticket_id]",
        cascade="all, delete-orphan"
    )
    
    # Mối quan hệ với User 
    requester = relationship("User", foreign_keys="[SupportTicketModel.user_id]", back_populates="submitted_tickets")
