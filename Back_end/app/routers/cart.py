from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List, Optional
from app.models.user_activity import UserActivity
from app.core.config import SessionLocal
from app.models.cart import Cart
from app.models.product import Product, Abs
from app.models.user import User
from app.schemas.cart import CartCreate, CartUpdate, CartResponse
from app.schemas.user_activity import UserActivitySchema, OutActivity
from app.dependencies.auth import get_current_user, require_admin
router = APIRouter(prefix="/cart", tags=["Cart"])

# ================== DEPENDENCY ==================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================== API GIỎ HÀNG ==================

# Lấy giỏ hàng của người dùng hiện tại
@router.get("/", response_model=List[CartResponse])
def get_my_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now()

    carts = (
        db.query(Cart, Product, Abs)
        .join(Product, Cart.product_id == Product.id)
        .outerjoin(
            Abs,
            (Abs.product_id == Product.id)
            & (Abs.start_time <= now)
            & (Abs.end_time >= now)
        )
        .filter(Cart.user_id == current_user.id)
        .all()
    )

    result = []
    for cart, product, abs in carts:
        price = product.price
        if abs:
            price = int(product.price * (100 - abs.percent_abs) / 100)

        cart_response = CartResponse(
            id=cart.id,
            user_id=cart.user_id,
            product_id=cart.product_id,
            quantity=cart.quantity,
            created_at=cart.created_at,
            updated_at=cart.updated_at,
            product={
                "id": product.id,
                "name": product.name,
                "price": price,
                "thumb": product.thumb,
                "main_image": product.main_image,
                "phanloai": product.phanloai,
                "brand": product.brand,
                "release_date": product.release_date,
            },
        )
        result.append(cart_response)

    return result


# Thêm sản phẩm vào giỏ
@router.post("/", response_model=CartResponse)
def add_to_cart(
    cart_in: CartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == cart_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart = (
        db.query(Cart)
        .filter(Cart.user_id == current_user.id, Cart.product_id == cart_in.product_id)
        .first()
    )

    if cart:
        cart.quantity += cart_in.quantity
    else:
        cart = Cart(
            user_id=current_user.id,
            product_id=cart_in.product_id,
            quantity=cart_in.quantity,
        )
        db.add(cart)

    db.commit()
    db.refresh(cart)

    now = datetime.now()
    abs = (
        db.query(Abs)
        .filter(
            Abs.product_id == product.id,
            Abs.start_time <= now,
            Abs.end_time >= now,
        )
        .first()
    )

    price = product.price
    if abs:
        price = int(product.price * (100 - abs.percent_abs) / 100)

    activity = UserActivity (
        user_id = current_user.id,
        product_id= product.id,
        action = "Cart"
    )
    db.add(activity)
    db.commit()

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        product_id=cart.product_id,
        quantity=cart.quantity,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
        product={
            "id": product.id,
            "name": product.name,
            "price": price,
            "thumb": product.thumb,
            "main_image": product.main_image,
            "phanloai": product.phanloai,
            "brand": product.brand,
            "release_date": product.release_date,
        },
    )


# Cập nhật số lượng hoặc trạng thái chọn
@router.put("/{cart_id}", response_model=CartResponse)
def update_cart(
    cart_id: int,
    cart_in: CartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id, Cart.user_id == current_user.id)
        .first()
    )
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found for this user")

    if cart_in.quantity is not None:
        if cart_in.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be >= 1")
        cart.quantity = cart_in.quantity

    if cart_in.selected is not None:
        cart.selected = cart_in.selected

    db.commit()
    db.refresh(cart)
    return cart


# Xóa sản phẩm khỏi giỏ
@router.delete("/{cart_id}")
def remove_from_cart(
    cart_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id, Cart.user_id == current_user.id)
        .first()
    )
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found for this user")

    db.delete(cart)
    db.commit()
    return {"detail": "Deleted successfully"}


# Tính tổng tiền trong giỏ hàng
@router.get("/calculate-total")
def calculate_cart_total(
    selected_ids: Optional[List[int]] = Query(None, description="Danh sách cart_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        now = datetime.now()

        query = (
            db.query(Cart)
            .options(joinedload(Cart.product).joinedload(Product.abs))
            .filter(Cart.user_id == current_user.id)
        )

        if selected_ids:
            query = query.filter(Cart.id.in_(selected_ids))

        cart_items = query.all()

        total_price = 0
        total_quantity = 0

        for cart_item in cart_items:
            product = getattr(cart_item, "product", None)
            if not product:
                continue

            price = product.price
            abs_obj = getattr(product, "abs", None)

            if abs_obj:
                if isinstance(abs_obj, list):
                    valid_abs = [
                        a
                        for a in abs_obj
                        if hasattr(a, "start_time")
                        and hasattr(a, "end_time")
                        and a.start_time <= now <= a.end_time
                    ]
                    if valid_abs:
                        price = price * (100 - valid_abs[0].percent_abs) / 100
                else:
                    if hasattr(abs_obj, "start_time") and hasattr(abs_obj, "end_time"):
                        if abs_obj.start_time <= now <= abs_obj.end_time:
                            price = price * (100 - abs_obj.percent_abs) / 100

            total_price += cart_item.quantity * price
            total_quantity += cart_item.quantity

        return {
            "total_price": round(total_price, 2),
            "total_quantity": total_quantity,
            "items_count": len(cart_items),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
