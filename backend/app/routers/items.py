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
from app.models.item import Item
from app.models.checkout import Inventory

router = APIRouter(tags=["items"])


# --- Categories ---

@router.get(
    "/categories",
    response_model=dict,
    summary="List categories",
    description="Return a paginated list of item categories. Supports search by name and server-side sorting.",
)
def list_categories(
    pagination: dict = Depends(pagination_params),
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, categories = item_crud.get_categories(
        db, skip=pagination["skip"], limit=pagination["limit"],
        search=search,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [CategoryResponse.model_validate(c) for c in categories],
    }


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
    description="Create a new item category. Admin only. Category names must be unique.",
)
def create_category(
    cat_in: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if item_crud.get_category_by_name(db, cat_in.name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
    return item_crud.create_category(db, cat_in)


@router.get(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Get a category",
    description="Return a single category by ID.",
)
def get_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = item_crud.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Update a category",
    description="Update a category's name or description. Admin only. Category names must be unique.",
)
def update_category(
    category_id: int,
    cat_in: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = item_crud.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if cat_in.name and cat_in.name != category.name:
        existing = item_crud.get_category_by_name(db, cat_in.name)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
    return item_crud.update_category(db, category, cat_in)


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category",
    description="Delete a category. Admin only. Cannot delete a category that has items assigned to it.",
)
def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    category = item_crud.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    has_items = db.query(Item).filter(Item.category_id == category_id).first()
    if has_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with existing items. Remove or reassign items first.",
        )
    item_crud.delete_category(db, category)


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
