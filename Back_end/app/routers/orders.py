from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.config import SessionLocal
from app.models.orders import Order, OrderItem
from app.models.product import Product
from app.schemas.orders import OrderResponse
from typing import List
from app.models.user import User
from app.dependencies.auth import get_current_user, require_admin

from web_shop.Back_end.app.dependencies.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

# ====================== Database Dependency ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== 📍 GET /orders/{user_id} ======================
@router.get("/{user_id}", response_model=List[OrderResponse])
def get_orders(user_id: int, db: Session = Depends(get_db)):
    """
    Lấy danh sách đơn hàng của 1 user (bao gồm sản phẩm bên trong)
    """
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    if not orders:
        return []

    result = []
    for order in orders:
        items = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": item.price,
                "product_name": item.product.name if item.product else None,
                "product_thumb": item.product.thumb if item.product else None,
            }
            for item in order.items
        ]

        result.append({
            "id": order.id,
            "user_id": order.user_id,
            "total_price": order.total_price,
            "status": order.status,
            "created_at": order.created_at,
            "items": items
        })

    return result


# ====================== 📍 POST /orders/{user_id} ======================
@router.post("/{user_id}", response_model=OrderResponse)
def create_order(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    """
    Tạo đơn hàng mới từ các sản phẩm được chọn trong giỏ hàng
    """
    from app.models.cart import Cart  # import tránh vòng lặp

    # Lấy các sản phẩm được chọn trong giỏ hàng
    cart_items = (
        db.query(Cart)
        .join(Product, Cart.product_id == Product.id)
        .filter(Cart.user_id == user_id, Cart.selected == True)
        .all()
    )

    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    # Tạo đơn hàng mới
    total_price = 0
    order = Order(user_id=user_id, total_price=0, status="pending", shipping_address="Địa chỉ mẫu", phone_number="0123456789", payment_method="Tiền mặt")
    db.add(order)
    db.commit()
    db.refresh(order)

    # Thêm từng sản phẩm trong giỏ vào OrderItem
    for cart in cart_items:
        price = cart.product.price
        total_price += price * cart.quantity

        order_item = OrderItem(
            order_id=order.id,
            product_id=cart.product_id,
            quantity=cart.quantity,
            price=price
        )
        db.add(order_item)
        db.delete(cart)  # Xóa sản phẩm đã đặt khỏi giỏ hàng

    order.total_price = total_price
    db.commit()
    db.refresh(order)

    # Tải lại order kèm danh sách sản phẩm
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )

    # Chuẩn hóa dữ liệu trả về theo schema
    return {
        "id": order.id,
        "user_id": order.user_id,
        "total_price": order.total_price,
        "status": order.status,
        "created_at": order.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": item.price,
                "product_name": item.product.name if item.product else None,
                "product_thumb": item.product.thumb if item.product else None,
            }
            for item in order.items
        ]
    }


# ====================== 📍 PUT /orders/{order_id}/status ======================
@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    """
    Cập nhật trạng thái đơn hàng (admin hoặc user thao tác)
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    db.commit()
    return {"message": "Cập nhật trạng thái thành công", "status": status}