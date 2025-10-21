from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.config import SessionLocal
from app.models.orders import Order, OrderItem
from app.models.product import Product
from app.models.user_activity import UserActivity
from app.schemas.orders import OrderResponse, OrderInput
from typing import List
from app.models.user import User
from app.dependencies.auth import get_current_user, require_admin


router = APIRouter(prefix="/orders", tags=["Orders"])

# ====================== Database Dependency ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== 📍 GET /orders/{user_id} ======================
@router.get("/", response_model=List[OrderResponse])
def get_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """
    Lấy danh sách đơn hàng của 1 user (bao gồm sản phẩm bên trong)
    """
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.user_id == current_user.id)
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
            "payment_method": order.payment_method,
            "shipping_address": order.shipping_address,
            "phone_number": order.phone_number,
            "status": order.status,
            "created_at": order.created_at,
            "items": items

        })

    return result


# ====================== 📍 POST /orders/{user_id} ======================
@router.post("/", response_model=OrderResponse)
def create_order(
    input_order: OrderInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    from app.models.cart import Cart  # import tránh vòng lặp

    carts = map(int, input_order.carts.split(','))
    # Lấy các sản phẩm được chọn trong giỏ hàng
    cart_items = []
    for cart in carts:
        cart_selected = (
            db.query(Cart)
            .join(Product, Cart.product_id == Product.id)
            .filter(Cart.user_id == current_user.id, Cart.selected == True, Cart.id == cart).first()
        )
        cart_items.append(cart_selected)

    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    # Tạo đơn hàng mới
    total_price = 0
    order = Order(user_id=current_user.id, total_price=0, status="pending", shipping_address=input_order.address, phone_number=input_order.phone, payment_method=input_order.pttt)
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
        db.delete(cart) # xóa rỏ hàng của sản phẩm vừa order
        
        activity = UserActivity (
            user_id = current_user.id,
            product_id = cart.product_id,
            action = "Order"
        )
        db.add(activity)



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

# ====================== 📍 GET /orders/all ======================
@router.get("/all", response_model=List[OrderResponse])
def get_all_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ADMIN: Lấy tất cả đơn hàng (kèm sản phẩm bên trong)
    """
    # Kiểm tra quyền admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.created_at.desc())
        .all()
    )

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
            "items": items,
            "payment_method": order.payment_method,
            "shipping_address": order.shipping_address,
            "phone_number": order.phone_number,
        })

    return result
