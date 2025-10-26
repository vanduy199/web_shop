from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from app.core.config import Base  # sửa import cho đúng với config project


class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    image_url = Column(String(512), nullable=True)  # cho phép null nếu không upload ngay
    link = Column(String(512), nullable=True)
    position = Column(String(50), nullable=True)    # để optional giống schema
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    active = Column(Boolean, nullable=False, server_default="1")  # router dùng active
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Banner(id={self.id}, position='{self.position}')>"