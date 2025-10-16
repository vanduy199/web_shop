from datetime import date
from re import S
from time import time
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class ProductSchema(BaseModel):
    id: int
    name: Optional[str] = None
    price : Optional[float] = None
    thumb : Optional[str] = None
    main_image : Optional[str] = None
    phanloai : Optional[str] = None
    brand : Optional[str] = None
    release_date : Optional[str] = None

    class Config:
        from_attributes = True

class AbsProduct(BaseModel):
    product_id : int
    percent_abs: float
    start_time : datetime
    end_time   : datetime

    class Config:
        from_attributes = True

class OutPutAbs(BaseModel):
    id: int
    name: Optional[str] = None
    price: Optional[float] = None
    thumb: Optional[str] = None
    main_image: Optional[str] = None
    phanloai: Optional[str] = None
    brand: Optional[str] = None
    release_date: Optional[str] = None
    percent_abs: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OutPutPage(BaseModel):
    remainingQuantity: Optional[int] = None
    show_product: List[OutPutAbs]


class AttributeSchema(BaseModel):
    key: str
    value: str
    loai_cau_hinh: str

class ImagesSchema(BaseModel):
    img: str

class PromotionSchema(BaseModel):
    percent_abs : float
    start_time: datetime
    end_time: datetime

class AddProductSchema(BaseModel):
    name: str
    phanloai: str
    price: float
    thumb: str
    main_image: Optional[str] = None
    brand: Optional[str] = None
    release_date: Optional[str] = None
    attributes: List[AttributeSchema] = []
    images: List[ImagesSchema] = []
    promotion: Optional[PromotionSchema] = None
    class Config:
        from_attributes = True

class ProductSearchResult(BaseModel):
    id: int
    name: str
    price: float
    phanloai_vi: str
    brand: str
    


