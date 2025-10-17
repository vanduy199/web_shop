import select
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String, func
from sqlalchemy.orm import relationship
from app.core.config import Base


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="Đang xử lý")
    created_at = Column(DateTime, server_default=func.now())
    shipping_address = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False)
    payment_method = Column(String(50), nullable=False, default="Tiền mặt")

    # Quan hệ 1-n: Order -> OrderItem
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

