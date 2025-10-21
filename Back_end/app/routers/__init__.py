# app/routers/__init__.py
from fastapi import APIRouter
from .product import router as product_router
from .cart import router as cart_router 
from .user_support import router as usersupport_router
from .admin_support import router as adminsupport_router

router = APIRouter()
router.include_router(product_router, prefix="/api", tags=["Products"])
router.include_router(cart_router, tags=["Cart"])
router.include_router(usersupport_router, tags=["User Support"])
router.include_router(adminsupport_router, tags=["Admin Support"])