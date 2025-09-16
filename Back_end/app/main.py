from email import message
from fastapi import FastAPI, HTTPException
from app.core.config import SessionLocal
from datetime import datetime
from app.models.product import Product, ProductImage, Specification, Abs
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ProductSchema, AbsProduct, OutPutAbs, AddProductSchema, ImagesSchema
app = FastAPI()
from typing import List, Dict, Optional

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép mọi nguồn, có thể chỉnh lại cho an toàn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/product', response_model= List[ProductSchema])
def getproduct(type: Optional[str] = None):
    db = SessionLocal()
    if type:
        product = db.query(Product).filter(Product.phanloai == type).all()
    else:
        product = db.query(Product).all()
    db.close()
    return product

@app.post('/abs', response_model = AbsProduct)
def push_abs(abs: AbsProduct):
    db = SessionLocal()
    newabs = Abs(**abs.model_dump())
    now = datetime.now()
    existabs = db.query(Abs).filter(
        Abs.start_time <= now, 
        Abs.end_time >= now, 
        Abs.product_id == newabs.product_id
    ).first()
    if existabs:
        raise HTTPException(400,"Product is existed in another Abs")
    db.add(newabs)
    db.commit()
    db.refresh(newabs)
    db.close()
    return newabs
@app.get('/abs', response_model = List[OutPutAbs])
def get_abs():
    db = SessionLocal()
    now = datetime.now()
    present_abs = db.query(Product,Abs).join(Abs, Abs.product_id == Product.id).filter(Abs.start_time <= now, Abs.end_time >= now).all()
    db.close()
    result = []
    for product_obj, abs_obj in present_abs:     
        result.append(OutPutAbs(
            id=product_obj.id,
            name=product_obj.name[:product_obj.name.find(' (')],
            price=product_obj.price,
            thumb=product_obj.thumb,
            main_image=product_obj.main_image,
            phanloai=product_obj.phanloai,
            brand=product_obj.brand,
            release_date=product_obj.release_date,
            percent_abs=abs_obj.percent_abs,
            start_time=abs_obj.start_time,
            end_time=abs_obj.end_time
        ))
    db.close()
    return result
@app.delete('/product')
def delete_product(product_id):
    db = SessionLocal()
    product_c = db.query(Product).filter(Product.id == product_id).first()
    if product_c:
        db.delete(product_c)
        db.commit()
        return {'message' : 'Product was deleted'}

@app.post('/product')
def add_product(product: AddProductSchema):
    db = SessionLocal()
    db_product = Product(
        name=product.name,
        phanloai=product.phanloai,
        price=product.price,
        thumb=product.thumb,
        main_image=product.main_image,
        brand=product.brand,
        release_date=product.release_date,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # thêm attributes
    for attr in product.attributes:
        db_attr = Specification(spec=attr.key, info=attr.value,loai_cau_hinh = attr.loai_cau_hinh, product_id=db_product.id)
        db.add(db_attr)
    db.commit()

    # thêm image
    for img in product.images:
        db_img = ProductImage(product_id = db_product.id, img = img.img)
        db.add(db_img)
    db.commit()

    # thêm promotion
    pro = product.promotion
    if pro:
        db_promo = Abs(product_id = db_product.id, percent_abs = pro.percent_abs, start_time = pro.start_time, end_time = pro.end_time)
        db.add(db_promo)
        db.commit()
    product_id = db.product_id
    db.close()
    return {
        product_id
    }