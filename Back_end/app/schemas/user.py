from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: Optional[str] = None
    phone: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = "customer"

class UserCreate(UserBase):
    password: str  

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str

class LoginSchema(BaseModel):
    phone: str
    password: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    id: Optional[int] = None
    role: Optional[str] = None