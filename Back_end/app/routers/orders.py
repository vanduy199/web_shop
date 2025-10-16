from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.config import SessionLocal
from app.models.orders import Order, OrderItem
from app.models.product import Product
from app.schemas.orders import OrderResponse
from typing import List

router = APIRouter(prefix="/orders", tags=["Orders"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== API ======================

# 📍 GET /orders/{user_id}
@router.get("/{user_id}", response_model=List[OrderResponse])
def get_orders(user_id: int, db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product)
        )
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    if not orders:
        return []

    # Gộp dữ liệu Product -> schema trả về
    result = []
    for order in orders:
        items = []
        for item in order.items:
            items.append({
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": item.price,
                "product_name": item.product.name if item.product else None,
                "product_thumb": item.product.thumb if item.product else None,
            })

        result.append({
            "id": order.id,
            "user_id": order.user_id,
            "total_price": order.total_price,
            "status": order.status,
            "created_at": order.created_at,
            "items": items
        })

    return result


# 📍 POST /orders/{user_id}
# (Tạo đơn hàng mới từ giỏ hàng)
@router.post("/{user_id}", response_model=OrderResponse)
def create_order(user_id: int, db: Session = Depends(get_db)):
    # Giả sử ở đây bạn có bảng Cart
    from app.models.cart import Cart

    cart_items = (
        db.query(Cart)
        .join(Product, Cart.product_id == Product.id)
        .filter(Cart.user_id == user_id, Cart.selected == True)
        .all()
    )

    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    total_price = 0
    order = Order(user_id=user_id, total_price=0)
    db.add(order)
    db.commit()
    db.refresh(order)

    for cart in cart_items:
        price = cart.product.price
        total_price += price * cart.quantity
        db.add(OrderItem(
            order_id=order.id,
            product_id=cart.product_id,
            quantity=cart.quantity,
            price=price
        ))
        # Xóa sản phẩm trong giỏ
        db.delete(cart)

    order.total_price = total_price
    db.commit()
    db.refresh(order)

    return order


# 📍 PUT /orders/{order_id}/status
@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    db.commit()
    return {"message": "Cập nhật trạng thái thành công", "status": status}
