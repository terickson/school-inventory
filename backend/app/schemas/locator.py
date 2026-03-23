from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LocatorBase(BaseModel):
    name: str
    description: str | None = None


class LocatorCreate(LocatorBase):
    pass


class LocatorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class LocatorResponse(BaseModel):
    id: int
    name: str
    description: str | None
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SublocatorBase(BaseModel):
    name: str
    description: str | None = None


class SublocatorCreate(SublocatorBase):
    pass


class SublocatorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SublocatorResponse(BaseModel):
    id: int
    name: str
    description: str | None
    locator_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
