from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.review import Review
from app.schemas.review import ReviewCreate, Response, ReviewOut
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
from app.core.config import SessionLocal
from typing import Optional, List
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
        user_id=current_user.id,        # ✅ Lấy user từ token
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
    reviews = db.query(Review).filter((Review.product_id == product_id) & (Review.id_parent == None)).order_by(Review.created_at).all()
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

 