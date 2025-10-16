from app.core.config import Base
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key = True,autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    price = Column(Float, nullable=True)
    thumb = Column(String)
    main_image = Column(String)
    phanloai = Column(String)
    brand = Column(String)
    release_date = Column(String)

    images = relationship("ProductImage", back_populates="product",cascade="all, delete-orphan")
    spec = relationship("Specification", back_populates= "product",cascade="all, delete-orphan")
    abs = relationship("Abs", back_populates="product",cascade="all, delete-orphan")
    activity = relationship("UserActivity", back_populates="product")
    carts = relationship("Cart", back_populates="product")

class ProductImage(Base):
    __tablename__ = 'product_images'

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    img = Column(String(512), nullable=False)

    product = relationship("Product", back_populates="images")

class Specification(Base):
    __tablename__ = 'specifications'

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable= False)
    spec = Column(String, nullable=False)
    info = Column(String, nullable=False)
    loai_cau_hinh = Column(String, nullable= False)

    product = relationship("Product", back_populates="spec")

class Abs(Base):
    __tablename__ = 'abs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable = False)
    percent_abs = Column(Float, nullable = False)
    start_time = Column(DateTime, nullable = False)
    end_time = Column(DateTime, nullable = False)

    product = relationship("Product", back_populates="abs")

class Search(Base):
    __tablename__ = 'product_search'

    id = Column(Integer, primary_key=True,autoincrement=True)
    name = Column(String, nullable = False)
    price = Column(Float)
    phanloai = Column(String)
    phanloai_vi = Column(String)
    brand = Column(String)
    cauhinh_daydu = Column(String)