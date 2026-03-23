from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    description: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemBase(BaseModel):
    name: str
    description: str | None = None
    category_id: int
    unit_of_measure: str = "unit"


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: int | None = None
    unit_of_measure: str | None = None


class CategoryNested(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class ItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    category_id: int
    unit_of_measure: str
    category: CategoryNested | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
