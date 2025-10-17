# app/routers/product.py (Bản đã tối ưu hóa)
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from sqlalchemy.orm import Session as DBSession # Đặt alias
from app.core.config import SessionLocal # Giả định SessionLocal nằm ở đây
from app.schemas.product import (
    ProductSchema, AddProductSchema, AbsProduct, OutPutAbs, ProductSearchResult, OutPutPage
)
# IMPORT SERVICE
from app.services import product as product_service 
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------- PRODUCT & CRUD --------------------

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
def add_product(product: AddProductSchema, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    # Service sẽ raise HTTPException nếu có lỗi
    return product_service.add_product(db, product)

@router.put("/product/{product_id}")
def update_product(product_id: int, payload: AddProductSchema, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    return product_service.update_product(db, product_id, payload)

@router.delete("/product")
def delete_product(product_id: int, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    return product_service.delete_product(db, product_id)


# -------------------- ABS & PROMOTION --------------------

@router.post("/abs", response_model=AbsProduct)
def push_abs(abs_data: AbsProduct, db: DBSession = Depends(get_db),current_user: User = Depends(require_admin)):
    return product_service.push_abs(db, abs_data)

@router.get("/abs", response_model=OutPutPage)
def get_abs(type: Optional[str] = None, page: int = 1, limit: int = 20,brand: Optional[str] = None, show_abs: bool = False,price: Optional[int] = None, db: DBSession = Depends(get_db),sort_price: Optional[str] = None):
    return product_service.get_abs(db, type=type, page=page, limit=limit, show_abs=show_abs, price = price, brand=brand, sort_price=sort_price)


# -------------------- SMART SEARCH --------------------

@router.get("/search/", response_model=List[ProductSearchResult])
def search_products(
    q: str = Query(..., description="Từ khóa tìm kiếm"),
    db: DBSession = Depends(get_db)
):
    results = product_service.ultimate_search_products(db, q)
    
    if not results:
        return []
    return results