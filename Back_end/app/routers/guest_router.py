from fastapi import APIRouter
from app.dependencies.auth import generate_guest_token

router = APIRouter(prefix="/api/auth", tags=["Guest Auth"])

@router.get("/guest-token")
def get_guest_token():
    token = generate_guest_token()
    return {"access_token": token, "token_type": "bearer"}
