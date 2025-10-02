from app.core.config import Base
from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship

class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)  # tạm bỏ ForeignKey
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    selected = Column(Boolean, nullable=False, default=True)  

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    
    product = relationship("Product", back_populates="carts")
