from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.config import SessionLocal
from app.models.orders import Order, OrderItem
from app.models.product import Product
from app.models.user_activity import UserActivity
from app.schemas.orders import OrderBase, OrderInput
from typing import List
from app.models.user import User
from Back_end.app.services.auth import get_current_user, require_admin


router = APIRouter(prefix="/orders", tags=["Orders"])

# ====================== Database Dependency ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== 📍 GET /orders/{user_id} ======================
@router.get("/", response_model=List[OrderBase])
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


# ====================== 📍 POST /orders ======================
@router.post("/", response_model=OrderBase)
def create_order(
    input_order: OrderInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.cart import Cart  # tránh vòng lặp import

    # 🧾 Tạo đơn hàng mới
    order = Order(
        user_id=current_user.id,
        total_price=0,
        status="pending",
        shipping_address=input_order.address,
        phone_number=input_order.phone,
        payment_method=input_order.pttt
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    total_price = 0

    # ✅ ƯU TIÊN: Nếu đặt hàng trực tiếp (không qua giỏ hàng)
    if input_order.product_id:
        print("🟢 Đặt hàng trực tiếp:", input_order.product_id, input_order.quantity)

        product = db.query(Product).filter(Product.id == input_order.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

        # đảm bảo quantity luôn hợp lệ
        quantity = getattr(input_order, "quantity", 1) or 1
        total_price = product.price * quantity

        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            price=product.price
        ))

        db.add(UserActivity(
            user_id=current_user.id,
            product_id=product.id,
            action="Order"
        ))

    # 🧺 Nếu không có product_id mà có giỏ hàng thì xử lý giỏ hàng
    elif input_order.carts and input_order.carts.strip():
        print("🟢 Đặt hàng từ giỏ hàng:", input_order.carts)

        cart_ids = [int(c) for c in input_order.carts.split(",") if c.strip()]
        carts = (
            db.query(Cart)
            .join(Product, Cart.product_id == Product.id)
            .filter(Cart.user_id == current_user.id, Cart.id.in_(cart_ids))
            .all()
        )

        for cart in carts:
            price = cart.product.price
            total_price += price * cart.quantity

            db.add(OrderItem(
                order_id=order.id,
                product_id=cart.product_id,
                quantity=cart.quantity,
                price=price
            ))

            db.add(UserActivity(
                user_id=current_user.id,
                product_id=cart.product_id,
                action="Order"
            ))

            db.delete(cart)

    else:
        raise HTTPException(status_code=400, detail="Không có sản phẩm trong đơn hàng")

    # ✅ Cập nhật tổng giá
    order.total_price = total_price
    db.commit()

    # ✅ Load lại order đầy đủ (có items và product)
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )

    return order

# ====================== 📍 PUT /orders/{order_id}/status ======================
@router.put("/{order_id}/status")
def update_order_status(
        order_id: int, 
        status: str, 
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
   # Kiểm tra quyền admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
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
@router.get("/all", response_model=List[OrderBase])
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

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
            Order.status == "pending"
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng hoặc không thể xóa")

    db.delete(order)
    db.commit()

    return {"message": "Xóa thành công"}
