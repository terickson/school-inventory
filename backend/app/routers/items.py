import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
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


def _enrich_item(item) -> ItemResponse:
    """Build an ItemResponse with image_url populated from image_filename."""
    resp = ItemResponse.model_validate(item)
    if item.image_filename:
        resp.image_url = f"/api/v1/uploads/{item.image_filename}"
    return resp


@router.get(
    "/items",
    response_model=dict,
    summary="List items",
    description="Return a paginated list of catalog items. Supports search by name, category filter, and server-side sorting.",
)
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
        "items": [_enrich_item(i) for i in items],
    }


@router.post(
    "/items",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an item",
    description="Create a new catalog item. Admin only. Requires a valid category_id.",
)
def create_item(
    item_in: ItemCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cat = item_crud.get_category(db, item_in.category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return _enrich_item(item_crud.create_item(db, item_in))


@router.get(
    "/items/{item_id}",
    response_model=ItemResponse,
    summary="Get an item",
    description="Return a single catalog item by ID.",
)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return _enrich_item(item)


@router.patch(
    "/items/{item_id}",
    response_model=ItemResponse,
    summary="Update an item",
    description="Update a catalog item's name, description, category, or unit. Admin only.",
)
def update_item(
    item_id: int,
    item_in: ItemUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return _enrich_item(item_crud.update_item(db, item, item_in))


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an item",
    description="Delete a catalog item. Admin only. Cannot delete items with existing inventory records.",
)
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
    # Clean up image file if present
    if item.image_filename:
        image_path = os.path.join(settings.upload_dir, item.image_filename)
        if os.path.exists(image_path):
            os.remove(image_path)
    item_crud.delete_item(db, item)


# --- Item Images ---


@router.post(
    "/items/{item_id}/image",
    response_model=ItemResponse,
    summary="Upload item image",
    description="Upload or replace the image for a catalog item. Accepts JPEG, PNG, or WebP up to 5 MB. Admin only.",
)
def upload_item_image(
    item_id: int,
    file: UploadFile,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type '{file.content_type}'. Allowed: {', '.join(allowed_types)}",
        )

    # Read and validate file size
    contents = file.file.read()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large. Maximum size is {settings.max_image_size_mb} MB.",
        )

    # Determine extension
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map[file.content_type]
    filename = f"item_{item_id}_{uuid.uuid4().hex[:8]}.{ext}"

    # Delete old image if present
    if item.image_filename:
        old_path = os.path.join(settings.upload_dir, item.image_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new image
    filepath = os.path.join(settings.upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Update database
    item.image_filename = filename
    db.commit()
    db.refresh(item)
    return _enrich_item(item)


@router.delete(
    "/items/{item_id}/image",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete item image",
    description="Remove the image from a catalog item. Admin only.",
)
def delete_item_image(
    item_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = item_crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    if not item.image_filename:
        return  # Idempotent -- no image to delete

    image_path = os.path.join(settings.upload_dir, item.image_filename)
    if os.path.exists(image_path):
        os.remove(image_path)

    item.image_filename = None
    db.commit()
