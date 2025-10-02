# app/routers/product.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from app.core.config import SessionLocal
from app.models.product import Product, ProductImage, Specification, Abs
from app.schemas.product import (
    ProductSchema, AddProductSchema, AttributeSchema,
    ImagesSchema, PromotionSchema, AbsProduct, OutPutAbs
)

router = APIRouter()

# -------------------- PRODUCT --------------------
@router.get("/product", response_model=List[ProductSchema])
def get_product(type: Optional[str] = None):
    db = SessionLocal()
    try:
        if type:
            products = db.query(Product).filter(Product.phanloai == type).all()
        else:
            products = db.query(Product).all()
        return products
    finally:
        db.close()


@router.get("/product_id", response_model=AddProductSchema)
def get_product_by_id(id: Optional[int] = None):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == id).first()
        if not product:
            raise HTTPException(404, "Không tìm thấy sản phẩm")

        # Lấy specifications theo product_id
        attrs = db.query(Specification).filter(Specification.product_id == id).all()
        attributes = [
            AttributeSchema(key=attr.spec, value=attr.info, loai_cau_hinh=attr.loai_cau_hinh)
            for attr in attrs
        ]

        # Lấy images
        imgs = db.query(ProductImage.img).filter(ProductImage.product_id == id).all()
        images = [ImagesSchema(img=img.img) for img in imgs]

        # Lấy promotion hiện tại (nếu có)
        now = datetime.now()
        present_abs = db.query(Abs).filter(
            Abs.start_time <= now,
            Abs.end_time >= now,
            Abs.product_id == id
        ).first()

        promotion = None
        if present_abs:
            promotion = PromotionSchema(
                percent_abs=present_abs.percent_abs,
                start_time=present_abs.start_time,
                end_time=present_abs.end_time
            )

        # Gói dữ liệu trả về
        db_product = AddProductSchema(
            name=product.name,
            phanloai=product.phanloai,
            price=product.price,
            thumb=product.thumb,
            main_image=product.main_image,
            brand=product.brand,
            release_date=product.release_date,
            attributes=attributes,
            images=images,
            promotion=promotion
        )
        return db_product
    finally:
        db.close()


@router.post("/product")
def add_product(product: AddProductSchema):
    db = SessionLocal()
    try:
        prod = db.query(Product).filter(Product.name == product.name).first()
        if prod:
            raise HTTPException(404, detail="Product already exists")

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
            db_attr = Specification(
                spec=attr.key,
                info=attr.value,
                loai_cau_hinh=attr.loai_cau_hinh,
                product_id=db_product.id
            )
            db.add(db_attr)
        db.commit()

        # thêm images
        for img in product.images:
            db_img = ProductImage(product_id=db_product.id, img=img.img)
            db.add(db_img)
        db.commit()

        # thêm promotion
        pro = product.promotion
        if pro:
            db_promo = Abs(
                product_id=db_product.id,
                percent_abs=pro.percent_abs,
                start_time=pro.start_time,
                end_time=pro.end_time
            )
            db.add(db_promo)
            db.commit()

        return {"message": "Product is added"}
    finally:
        db.close()


@router.put("/product/{product_id}")
def update_product(product_id: int, payload: AddProductSchema):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Cập nhật các field cơ bản
        product.name = payload.name
        product.phanloai = payload.phanloai
        product.price = payload.price
        product.brand = payload.brand
        product.release_date = payload.release_date
        product.thumb = payload.thumb
        product.main_image = payload.main_image

        # Xóa attributes cũ -> thêm mới
        db.query(Specification).filter(Specification.product_id == product_id).delete()
        for attr in payload.attributes:
            spec = Specification(
                product_id=product_id,
                spec=attr.key,
                info=attr.value,
                loai_cau_hinh=attr.loai_cau_hinh
            )
            db.add(spec)

        # Xóa images cũ -> thêm mới
        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        for img in payload.images:
            image = ProductImage(product_id=product_id, img=img.img)
            db.add(image)

        # Cập nhật promotion
        db.query(Abs).filter(Abs.product_id == product_id).delete()
        if payload.promotion:
            promo = Abs(
                product_id=product_id,
                percent_abs=payload.promotion.percent_abs,
                start_time=payload.promotion.start_time,
                end_time=payload.promotion.end_time
            )
            db.add(promo)

        db.commit()
        db.refresh(product)
        return {"message": "Product updated successfully", "product": product}
    finally:
        db.close()


@router.delete("/product")
def delete_product(product_id: int):
    db = SessionLocal()
    try:
        product_c = db.query(Product).filter(Product.id == product_id).first()
        if product_c:
            db.delete(product_c)
            db.commit()
            return {"message": "Product was deleted"}
        raise HTTPException(404, "Product not found")
    finally:
        db.close()

# -------------------- ABS --------------------
@router.post("/abs", response_model=AbsProduct)
def push_abs(abs: AbsProduct):
    db = SessionLocal()
    try:
        newabs = Abs(**abs.model_dump())
        now = datetime.now()

        existabs = db.query(Abs).filter(
            Abs.start_time <= now,
            Abs.end_time >= now,
            Abs.product_id == newabs.product_id
        ).first()
        if existabs:
            raise HTTPException(400, "Product is existed in another Abs")

        db.add(newabs)
        db.commit()
        db.refresh(newabs)
        return newabs
    finally:
        db.close()


@router.get("/abs", response_model=List[OutPutAbs])
def get_abs(type: Optional[str] = None, page: int = 1, limit: int = 20, show_abs: bool = False):
    db = SessionLocal()
    try:
        now = datetime.now()
        present_abs = (
            db.query(Product, Abs)
            .outerjoin(
                Abs,
                (Abs.product_id == Product.id) &
                (Abs.start_time <= now) &
                (Abs.end_time >= now)
            )
        )

        if type == "phukien":
            present_abs = present_abs.filter(~Product.phanloai.in_(["phone", "laptop", "tablet"]))
        elif type:
            present_abs = present_abs.filter(Product.phanloai == type)

        total = present_abs.count()

        # phân trang
        if not show_abs:
            present_abs = present_abs.offset((page - 1) * limit).limit(limit).all()
        result = []


        for product_obj, abs_obj in present_abs:
            if product_obj.phanloai == "laptop" and "(" in product_obj.name:
                product_obj.name = product_obj.name.split("(")[0]

            result.append(
                OutPutAbs(
                    id=product_obj.id,
                    name=product_obj.name,
                    price=product_obj.price,
                    thumb=product_obj.thumb,
                    main_image=product_obj.main_image,
                    phanloai=product_obj.phanloai,
                    brand=product_obj.brand,
                    release_date=product_obj.release_date,
                    percent_abs=abs_obj.percent_abs if abs_obj else 0,
                    start_time=abs_obj.start_time if abs_obj else None,
                    end_time=abs_obj.end_time if abs_obj else None,
                )
            )
        return result
    finally:
        db.close()

