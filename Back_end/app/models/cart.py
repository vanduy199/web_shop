from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from app.core.config import Base

class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Liên kết tới bảng users
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Liên kết tới bảng products
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False, default=1)
    selected = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- Relationships ---
    user = relationship("User", back_populates="carts")       # Mỗi giỏ hàng thuộc 1 user
    product = relationship("Product", back_populates="carts") # Mỗi giỏ hàng có 1 product
