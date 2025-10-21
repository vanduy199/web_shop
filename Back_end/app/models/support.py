from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.config import Base


class SupportTicketModel(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    assigned_to_id = Column(Integer, nullable=True)
    first_message_id = Column(Integer, ForeignKey("support_messages.id"), nullable=True) 

    subject = Column(String(255), nullable=False)
    issue_type = Column(String(50), nullable=False, default='Khác')
    status = Column(String(20), nullable=False, default='New')
    priority = Column(String(20), nullable=False, default='Medium')
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    requester_name = Column(String(255), nullable=True) 
    requester_email = Column(String(255), nullable=True) 
    requester_phone = Column(String(20), nullable=True)

    messages = relationship(
        "SupportMessageModel", 
        back_populates="ticket",
        primaryjoin="SupportTicketModel.id == SupportMessageModel.ticket_id",
        foreign_keys="[SupportMessageModel.ticket_id]", 
        cascade="all, delete-orphan"
    )
    
    requester = relationship("User", foreign_keys=[user_id], back_populates="submitted_tickets")


class SupportMessageModel(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True) 

    sender_type = Column(String(10), nullable=False)
    message = Column(String, nullable=True) 
    attachment_url = Column(String(255), nullable=True) 
    created_at = Column(DateTime, server_default=func.now())

    ticket = relationship(
        "SupportTicketModel", 
        back_populates="messages",
        foreign_keys=[ticket_id]
    )
   
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")