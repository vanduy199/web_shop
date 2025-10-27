from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from app.core.config import Base  # Đảm bảo import đúng base trong project

class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    image_url = Column(String(512), nullable=True)
    link_url = Column(String(512), nullable=True)
    position = Column(String(100), nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="1")
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Banner id={self.id}, position={self.position}, active={self.is_active}>"
