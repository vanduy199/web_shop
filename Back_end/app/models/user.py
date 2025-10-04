from sqlalchemy import Column, Integer, String, Date, DateTime, func
from app.core.config import Base
from sqlalchemy.orm import relationship
from app.models.user_activity import UserActivity

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)  
    phone = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)  
    email = Column(String(255), unique=True, nullable=True)
    role = Column(String(50), default="USER")
    created_at = Column(DateTime, server_default=func.now())

    activity = relationship("UserActivity", back_populates="owner")