from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.review import Review
from app.schemas.review import ReviewCreate, Response, ReviewOut
from app.services.authentication import get_current_user, require_admin
from app.models.user import User
from app.core.config import SessionLocal
from typing import Optional, List
from sqlalchemy.sql import func
router = APIRouter(prefix="/reviews", tags=["Reviews"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_review(
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_review = Review(
        user_id=current_user.id,        
        product_id=review.product_id,
        rating=review.rating,
        comment=review.comment,
        id_parent=review.id_parent
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.post("/response")
def response_review(
    review: Response,
    db: Session = Depends(get_db),
    id_parent = int,
    current_user: User = Depends(require_admin)
):
    new_review = Review(
        user_id=current_user.id, 
        product_id= review.product_id,    
        comment=review.comment,
        id_parent=id_parent
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/", response_model=List[ReviewOut])
def get_review(
    product_id,
    db: Session = Depends(get_db)
):
    reviews = db.query(Review).filter((Review.product_id == product_id) & (Review.id_parent == None) & (Review.comment != None)).order_by(Review.created_at).all()
    review_all = []
    for review in reviews:
        x = review.id
        child = []
        childrens = db.query(Review).filter(Review.id_parent == x).all()
        for children in childrens:
            text = ""
            if children.comment:
                text = children.comment
            a = Response(
                comment= text,
                product= children.product_id
            )
            child.append(a)
        rv = ReviewOut (
            id = review.id,
            product_id = review.product_id,
            user_id = review.user_id,
            comment = review.comment,
            created_at = review.created_at,
            comment_children = child
        )
        review_all.append(rv)
    return review_all

# Front End + Get Rating(Avg, count)

 # 📊 Endpoint riêng để lấy điểm trung bình rating của sản phẩm
@router.get("/rating")
def get_average_rating(product_id: int, db: Session = Depends(get_db)):
   
    cnt_rating_1star =(
        db.query(func.count(Review.rating))
        .filter(Review.product_id == product_id, Review.rating == 1)
        .scalar()
    )
    cnt_rating_2star =(
        db.query(func.count(Review.rating))
        .filter(Review.product_id == product_id, Review.rating == 2)
        .scalar()
    )
    cnt_rating_3star =(
        db.query(func.count(Review.rating))
        .filter(Review.product_id == product_id, Review.rating == 3)
        .scalar()
    )
    cnt_rating_4star =(
        db.query(func.count(Review.rating))
        .filter(Review.product_id == product_id, Review.rating == 4)
        .scalar()
    )
    cnt_rating_5star =(
        db.query(func.count(Review.rating))
        .filter(Review.product_id == product_id, Review.rating == 5)
        .scalar()
    )
    sum_rating = (1 * cnt_rating_1star +
                  2 * cnt_rating_2star +
                  3 * cnt_rating_3star +
                  4 * cnt_rating_4star +
                  5 * cnt_rating_5star)
    cnt_rating = (cnt_rating_1star + cnt_rating_2star + cnt_rating_3star + cnt_rating_4star + cnt_rating_5star)
    avg_rating = sum_rating / cnt_rating if cnt_rating > 0 else 0
    return {
        "product_id": product_id,
        "average_rating": round(avg_rating or 0, 2),
        "rating_count": cnt_rating,
        "1_star_count": cnt_rating_1star,
        "2_star_count": cnt_rating_2star,
        "3_star_count": cnt_rating_3star,
        "4_star_count": cnt_rating_4star,
        "5_star_count": cnt_rating_5star
    }
# =================== Thêm hoặc cập nhật rating ===================
@router.post("/rating")
def post_rating(
    product_id: int,
    rating: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating phải nằm trong khoảng 1-5")

    # Kiểm tra xem user đã đánh giá chưa
    existing = (
        db.query(Review)
        .filter(
            Review.product_id == product_id,
            Review.user_id == current_user.id,
            Review.id_parent == None
        )
        .first()
    )

    if existing:
        existing.rating = rating
        db.commit()
        db.refresh(existing)
        return {"message": "Đã cập nhật rating", "rating": rating}

    # Nếu chưa có, tạo mới
    new_rating = Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=rating
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return {"message": "Đã thêm rating mới", "rating": rating}
