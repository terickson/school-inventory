from datetime import datetime
from pydantic import BaseModel, ConfigDict


class InventoryBase(BaseModel):
    item_id: int
    locator_id: int
    sublocator_id: int | None = None
    quantity: int = 0
    min_quantity: int = 0


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    quantity: int | None = None
    min_quantity: int | None = None


class NestedItem(BaseModel):
    id: int
    name: str
    unit_of_measure: str | None = None

    model_config = ConfigDict(from_attributes=True)


class NestedLocator(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class NestedSublocator(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class NestedUser(BaseModel):
    id: int
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class InventoryResponse(BaseModel):
    id: int
    item_id: int
    locator_id: int
    sublocator_id: int | None
    quantity: int
    min_quantity: int
    item: NestedItem | None = None
    locator: NestedLocator | None = None
    sublocator: NestedSublocator | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventoryAdjust(BaseModel):
    adjustment: int
    reason: str


class CheckoutBase(BaseModel):
    inventory_id: int
    quantity: int
    notes: str | None = None


class CheckoutCreate(CheckoutBase):
    user_id: int | None = None  # Admin can checkout on behalf of another user


class NestedInventoryForCheckout(BaseModel):
    id: int
    item: NestedItem | None = None
    locator: NestedLocator | None = None
    sublocator: NestedSublocator | None = None

    model_config = ConfigDict(from_attributes=True)


class CheckoutResponse(BaseModel):
    id: int
    inventory_id: int
    user_id: int
    quantity: int
    returned_quantity: int
    checkout_date: datetime
    return_date: datetime | None
    status: str
    notes: str | None
    inventory: NestedInventoryForCheckout | None = None
    user: NestedUser | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckoutReturn(BaseModel):
    quantity: int | None = None  # None means return all
    notes: str | None = None


class CheckoutSummary(BaseModel):
    total_items: int
    active_checkouts: int
    low_stock_count: int


class PaginatedResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list
