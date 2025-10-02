from app.core.config import Base
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from datetime import datetime, timezone

class UserActivity(Base):
    __tablename__ = "user_activity"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    product_id = Column(Integer,ForeignKey("products.id"), nullable = False)
    action = Column(String, nullable = False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="activity")
    product = relationship("Product", back_populates="activity")


