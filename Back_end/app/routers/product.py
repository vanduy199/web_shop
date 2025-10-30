# app/routers/product.py (Bản đã tối ưu hóa)
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session as DBSession # Đặt alias
from app.core.config import SessionLocal # Giả định SessionLocal nằm ở đây
from app.schemas.product import (
    ProductSchema, AddProductSchema, AbsProduct, OutPutAbs, ProductSearchResult, OutPutPage
)
from app.services import product as product_service 
from app.services.auth import get_current_user, require_admin
from app.models.user import User
import json
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/product", response_model=List[ProductSchema])
def get_product(type: Optional[str] = None, db: DBSession = Depends(get_db)):
    products = product_service.get_products(db, type=type)
    return products

@router.get("/product_id", response_model=AddProductSchema)
def get_product_by_id(id: int, db: DBSession = Depends(get_db)):
    product = product_service.get_product_detail_by_id(db, id)
    if not product:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    return product

@router.post("/product")
async def add_product(
    name: str = Form(...),
    phanloai: str = Form(...),
    price: float = Form(...),
    brand: Optional[str] = Form(None),
    release_date: Optional[str] = Form(None),
    thumb: UploadFile = File(...),
    main_image: Optional[UploadFile] = File(None),
    attributes: Optional[str] = Form(None),
    images: Optional[str] = Form(None),
    image_urls: Optional[str] = Form(None),
    promotion: Optional[str] = Form(None),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Thêm sản phẩm mới với file upload"""
    try:
        # Upload ảnh lên Cloudinary
        thumb_url = await product_service.upload_to_cloudinary(thumb)
        
        main_image_url = None
        if main_image:
            main_image_url = await product_service.upload_to_cloudinary(main_image)
        
        # Parse JSON strings
        attributes_data = json.loads(attributes) if attributes else []
        images_data = json.loads(images) if images else []
        image_urls_data = json.loads(image_urls) if image_urls else []
        promotion_data = json.loads(promotion) if promotion else None
        
        # Merge images từ files và URLs
        all_images = images_data + image_urls_data
        
        # Tạo product schema
        product_data = AddProductSchema(
            name=name,
            phanloai=phanloai,
            price=price,
            brand=brand,
            release_date=release_date,
            thumb=thumb_url,
            main_image=main_image_url,
            attributes=attributes_data,
            images=all_images,
            promotion=promotion_data
        )
        
        return product_service.add_product(db, product_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/product/{product_id}")
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    phanloai: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    brand: Optional[str] = Form(None),
    release_date: Optional[str] = Form(None),
    thumb: Optional[UploadFile] = File(None),
    main_image: Optional[UploadFile] = File(None),
    attributes: Optional[str] = Form(None),
    images: Optional[str] = Form(None),
    image_urls: Optional[str] = Form(None),
    promotion: Optional[str] = Form(None),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Cập nhật sản phẩm với file upload"""
    try:
        # Lấy product cũ
        existing_product = product_service.get_product_detail_by_id(db, product_id)
        if not existing_product:
            raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
        
        # Upload ảnh mới nếu có
        thumb_url = existing_product.thumb
        if thumb:
            thumb_url = await product_service.upload_to_cloudinary(thumb)
        
        main_image_url = existing_product.main_image
        if main_image:
            main_image_url = await product_service.upload_to_cloudinary(main_image)
        
        # Parse additional images nếu có
        images_data = existing_product.images if hasattr(existing_product, 'images') else []
        if images:
            images_data = json.loads(images)
        
        # Parse URLs
        image_urls_data = json.loads(image_urls) if image_urls else []
        all_images = images_data + image_urls_data
        
        # Parse attributes nếu có
        attributes_data = existing_product.attributes if hasattr(existing_product, 'attributes') else []
        if attributes:
            attributes_data = json.loads(attributes)
        
        # Parse promotion nếu có
        promotion_data = existing_product.promotion if hasattr(existing_product, 'promotion') else None
        if promotion:
            promotion_data = json.loads(promotion)
        
        # Tạo product schema với dữ liệu mới
        product_data = AddProductSchema(
            name=name or existing_product.name,
            price=price or existing_product.price,
            phanloai=phanloai or existing_product.phanloai,
            brand=brand or existing_product.brand,
            release_date=release_date or existing_product.release_date,
            thumb=thumb_url,
            main_image=main_image_url,
            attributes=attributes_data,
            images=all_images,
            promotion=promotion_data
        )
        
        return product_service.update_product(db, product_id, product_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/product")
def delete_product(product_id: int, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    return product_service.delete_product(db, product_id)



@router.post("/abs", response_model=AbsProduct)
def push_abs(abs_data: AbsProduct, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    return product_service.push_abs(db, abs_data)

@router.get("/abs", response_model=OutPutPage)
def get_abs(type: Optional[str] = None, page: int = 1, limit: int = 20,brand: Optional[str] = None, show_abs: bool = False,price: Optional[int] = None, db: DBSession = Depends(get_db),sort_price: Optional[str] = None):
    return product_service.get_abs(db, type=type, page=page, limit=limit, show_abs=show_abs, price = price, brand=brand, sort_price=sort_price)



@router.get("/search/",response_model=ProductSearchResult)
def search_products(
    db: DBSession = Depends(get_db),
    q: str = Query(..., description="Từ khóa tìm kiếm"),
    page: int = 1, limit: int = 20,brand: Optional[str] = None,sort_price: Optional[str] = None
):
    length, results = product_service.ultimate_search_products(db, q,page = page, limit = limit, brand = brand, sort_price = sort_price)
    if not results:
        results = []
    output = ProductSearchResult(
        title = q,
        number = length,
        show_product=results
    )
    return output

@router.get("/recommend/user")
def recommend_for_user(
    db: DBSession = Depends(get_db),
    current_user = Depends(get_current_user),
    top_n: int = Query(32, ge=1, le=64)
):
    """Lấy sản phẩm gợi ý dựa trên user activity (yêu cầu login)"""
    recommendations = product_service.get_user_recommendations(db, current_user.id, top_n)
    
    if recommendations is None:
        recommendations = []
    
    return {
        "success": True,
        "data": recommendations,
        "count": len(recommendations)
    }


@router.get("/recommend/trending")
def get_trending_products(
    db: DBSession = Depends(get_db),
    top_n: int = Query(32, ge=1, le=64)
):
    """Lấy sản phẩm trending dựa trên số lượt tương tác (không yêu cầu login)"""
    recommendations = product_service.get_trending_products(db, top_n)
    
    return {
        "success": True,
        "data": recommendations,
        "count": len(recommendations)
    }


@router.get("/recommend/{product_id}")
def recommend_products(
    product_id: int,
    db: DBSession = Depends(get_db),
    top_n: int = Query(5, ge=1, le=20)
):
    recommendations = product_service.get_product_recommendations(db, product_id, top_n)
    
    if recommendations is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy sản phẩm hoặc mô hình recommendation chưa được tải"
        )
    
    return {
        "success": True,
        "data": recommendations,
        "count": len(recommendations)
    }

@router.post("/upload_img", response_model=List[str])
async def upload_product_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_admin)
):
    uploaded_urls = []
    
    for file in files:
        url = await product_service.upload_to_cloudinary(file)
        uploaded_urls.append(url)
    
    return uploaded_urls