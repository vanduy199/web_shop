from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from datetime import datetime

# Import models ở trong hàm để tránh vòng lặp import khi cần
def get_orders_for_user(db: Session, user_id: int):
    from app.models.orders import Order, OrderItem
    from app.models.product import Product

    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders

def create_order(db: Session, current_user, input_order):
    from app.models.orders import Order, OrderItem
    from app.models.product import Product
    from app.models.user_activity import UserActivity

    from app.models.cart import Cart  # import khi cần

    order = Order(
        user_id=current_user.id,
        total_price=0,
        status="pending",
        shipping_address=input_order.address,
        phone_number=input_order.phone,
        payment_method=input_order.pttt,
        created_at=datetime.utcnow()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    total_price = 0

    if getattr(input_order, "product_id", None):
        product = db.query(Product).filter(Product.id == input_order.product_id).first()
        if not product:
            raise ValueError("Product not found")
        quantity = getattr(input_order, "quantity", 1) or 1
        total_price = product.price * quantity
        db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, price=product.price))
        db.add(UserActivity(user_id=current_user.id, product_id=product.id, action="Order"))

    elif getattr(input_order, "carts", None) and input_order.carts.strip():
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
            db.add(OrderItem(order_id=order.id, product_id=cart.product_id, quantity=cart.quantity, price=price))
            db.add(UserActivity(user_id=current_user.id, product_id=cart.product_id, action="Order"))
            db.delete(cart)
    else:
        raise ValueError("No product in order")

    order.total_price = total_price
    db.commit()

    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )
    return order

def update_order_status(db: Session, order_id: int, status: str):
    from app.models.orders import Order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found")
    order.status = status
    db.commit()
    return order

def get_all_orders(db: Session):
    from app.models.orders import Order, OrderItem
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders

def delete_order(db: Session, order_id: int, user_id: int):
    from app.models.orders import Order
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == user_id, Order.status == "pending")
        .first()
    )
    if not order:
        raise ValueError("Order not found or cannot delete")
    db.delete(order)
    db.commit()
    return True