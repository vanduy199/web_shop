# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import router as api_router, user as user_router, user_activity, authentication

app = FastAPI(title="Product & ABS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(user_router.router, tags=["Users"])
app.include_router(user_activity.router)
app.include_router(authentication.router, tags=["Login"])
