from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles 
from app.core.security import decode_access_token

from app.routers import router as api_router, user as user_router, user_activity, authentication
from app.routers import orders

from app.routers import guest_router

from app.routers import review
app = FastAPI(title="Product & ABS API")

bearer_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    # decode JWT
    return decode_access_token(token)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Web Shop API",
        version="1.0.0",
        description="API cho web shop",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ---- Cấu hình CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # cho phép mọi nguồn (FE nào cũng gọi được)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(api_router)
app.include_router(user_router.router, tags=["Users"])
app.include_router(user_activity.router)
app.include_router(authentication.router, tags=["Login"])
app.include_router(orders.router, tags=["Orders"])

app.include_router(guest_router.router)

app.include_router(review.router, tags=["Reviews"])
app.include_router(authentication.router, tags=["Auth"])
app.include_router(orders.router, tags=["Orders"])

