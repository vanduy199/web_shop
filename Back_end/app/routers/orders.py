# ...existing code...
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.schemas.orders import OrderBase, OrderInput
from typing import List
from app.models.user import User
from app.dependencies.auth import get_current_user

# import service
from app.services import orders as orders_service

router = APIRouter(prefix="/orders", tags=["Orders"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[OrderBase])
def get_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    orders = orders_service.get_orders_for_user(db, current_user.id)
    # giữ logic mapping giống trước nếu cần (router trả về dicts)
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


@router.post("/", response_model=OrderBase)
def create_order(
    input_order: OrderInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        order = orders_service.create_order(db, current_user, input_order)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    try:
        orders_service.update_order_status(db, order_id, status)
        return {"message": "Cập nhật trạng thái thành công", "status": status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/all", response_model=List[OrderBase])
def get_all_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    orders = orders_service.get_all_orders(db)
    # mapping same as before
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
    try:
        orders_service.delete_order(db, order_id, current_user.id)
        return {"message": "Xóa thành công"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
# ...existing code...