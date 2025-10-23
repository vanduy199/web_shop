# app/routers/__init__.py
from fastapi import APIRouter
from .product import router as product_router
from .cart import router as cart_router 

router = APIRouter()
router.include_router(product_router, prefix="/api", tags=["Products"])
router.include_router(cart_router, tags=["Cart"])