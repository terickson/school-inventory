from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    full_name: str = ""


class UserCreate(UserBase):
    password: str
    role: str = "teacher"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserSelfUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PasswordReset(BaseModel):
    new_password: str
