from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session, joinedload
from app.core.config import SessionLocal
from app.models.cart import Cart
from datetime import datetime
from app.models.product import Product, Abs
from app.schemas.cart import CartCreate, CartUpdate, CartResponse
from typing import List, Optional



router = APIRouter()

# Dependency get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================== API GIỎ HÀNG ==================

@router.get("/{user_id}", response_model=List[CartResponse])
def get_cart(user_id: int, db: Session = Depends(get_db)):
    now = datetime.now()

    # Lấy cart + product + abs
    carts = (
        db.query(Cart, Product, Abs)
        .join(Product, Cart.product_id == Product.id)
        .outerjoin(
            Abs,
            (Abs.product_id == Product.id) &
            (Abs.start_time <= now) &
            (Abs.end_time >= now)
        )
        .filter(Cart.user_id == user_id)
        .all()
    )

    result = []
    for cart, product, abs in carts:
        # Tính giá khuyến mãi
        price = product.price
        if abs:
            price = int(product.price * (100 - abs.percent_abs) / 100)

        # Map dữ liệu cho response (theo CartResponse)
        cart_response = CartResponse(
            id=cart.id,
            user_id=cart.user_id,
            product_id=cart.product_id,
            quantity=cart.quantity,
            created_at=cart.created_at,
            updated_at=cart.updated_at,
            # Ghi đè giá trong product
            product={
                "id": product.id,
                "name": product.name,
                "price": price,   
                "thumb": product.thumb,
                "main_image": product.main_image,
                "phanloai": product.phanloai,
                "brand": product.brand,
                "release_date": product.release_date,
            }
        )
        result.append(cart_response)

    return result
# add sản phẩm vào cart
@router.post("/{user_id}", response_model=CartResponse)
def add_to_cart(
    user_id: int,  
    cart_in: CartCreate,
    db: Session = Depends(get_db),
):
    # Kiểm tra sản phẩm có tồn tại không
    product = db.query(Product).filter(Product.id == cart_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Kiểm tra xem sản phẩm đã có trong giỏ chưa
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.product_id == cart_in.product_id)
        .first()
    )

    if cart:
        cart.quantity += cart_in.quantity
    else:
        cart = Cart(
            user_id=user_id,
            product_id=cart_in.product_id,
            quantity=cart_in.quantity,
        )
        db.add(cart)
    db.commit() 
    db.refresh(cart)

    # Tính giá khuyến mãi trước khi trả về
    now = datetime.now()
    abs = db.query(Abs).filter(
        Abs.product_id == product.id,
        Abs.start_time <= now,
        Abs.end_time >= now
    ).first()

    price = product.price
    if abs:
        price = int(product.price * (100 - abs.percent_abs) / 100)

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
        }
    )


# Cập nhật số lượng / selected
@router.put("/{user_id}/{cart_id}", response_model=CartResponse)
def update_cart(
    user_id: int,
    cart_id: int,
    cart_in: CartUpdate,
    db: Session = Depends(get_db),
):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id, Cart.user_id == user_id)
        .first()
    )
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found for this user")

    # cập nhật quantity
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
@router.delete("/{user_id}/{cart_id}")
def remove_from_cart(user_id: int, cart_id: int, db: Session = Depends(get_db)):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id, Cart.user_id == user_id)
        .first()
    )
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found for this user")

    db.delete(cart)
    db.commit()
    return {"detail": "Deleted successfully"}

# tổng số tiền trong giỏ hàng

@router.get("/{user_id}/calculate-total")
def calculate_cart_total(
    user_id: int = Path(..., description="ID của user"),
    selected_ids: Optional[List[int]] = Query(None, description="Danh sách cart_id"),
    db: Session = Depends(get_db)
):
    try:
        now = datetime.now()
        print(f"DEBUG: user_id={user_id}, selected_ids={selected_ids}")

        query = (
            db.query(Cart)
            .options(joinedload(Cart.product).joinedload(Product.abs))
            .filter(Cart.user_id == user_id)
        )

        if selected_ids:
            query = query.filter(Cart.id.in_(selected_ids))

        cart_items = query.all()
        print(f"DEBUG: Found {len(cart_items)} cart items")

        total_price = 0
        total_quantity = 0

        for cart_item in cart_items:
            product = getattr(cart_item, "product", None)
            if not product:
                print(f"ERROR: Cart item {cart_item.id} missing product")
                continue

            price = product.price
            abs_obj = getattr(product, "abs", None)

            # Nếu abs là danh sách, lấy khuyến mãi còn hiệu lực
            if abs_obj:
                if isinstance(abs_obj, list):
                    valid_abs = [
                        a for a in abs_obj
                        if hasattr(a, "start_time") and hasattr(a, "end_time") and a.start_time <= now <= a.end_time
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

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
