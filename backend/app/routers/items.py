from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import item as item_crud
from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.pagination import pagination_params
from app.schemas.item import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    ItemCreate, ItemUpdate, ItemResponse,
)
from app.models.user import User
from app.models.checkout import Inventory

router = APIRouter(tags=["items"])


# --- Categories ---

@router.get("/categories", response_model=dict)
def list_categories(
    pagination: dict = Depends(pagination_params),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, categories = item_crud.get_categories(db, skip=pagination["skip"], limit=pagination["limit"])
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [CategoryResponse.model_validate(c) for c in categories],
    }


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return item_crud.create_category(db, cat_in)


# --- Items ---

@router.get("/items", response_model=dict)
def list_items(
    pagination: dict = Depends(pagination_params),
    search: str | None = None,
    category_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, items = item_crud.get_items(
        db, skip=pagination["skip"], limit=pagination["limit"],
        search=search, category_id=category_id,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [ItemResponse.model_validate(i) for i in items],
    }


@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    item_in: ItemCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Verify category exists
    cat = item_crud.get_category(db, item_in.category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return item_crud.create_item(db, item_in)


@router.get("/items/{item_id}", response_model=ItemResponse)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.patch("/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    item_in: ItemUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item_crud.update_item(db, item, item_in)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    has_inventory = db.query(Inventory).filter(Inventory.item_id == item_id).first()
    if has_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete item with existing inventory records.",
        )
    item_crud.delete_item(db, item)
