from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import checkout as checkout_crud
from app.crud import locator as locator_crud
from app.crud import item as item_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.checkout import (
    InventoryCreate, InventoryUpdate, InventoryAdjust, InventoryResponse,
    QuickAddRequest, QuickAddResponse, NestedItem,
)
from app.models.user import User
from app.models.item import Item, Category
from app.models.checkout import Checkout, Inventory

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=dict)
def list_inventory(
    pagination: dict = Depends(pagination_params),
    locator_id: int | None = None,
    item_id: int | None = None,
    low_stock: bool = False,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, records = checkout_crud.get_inventory_records(
        db, skip=pagination["skip"], limit=pagination["limit"],
        locator_id=locator_id, item_id=item_id, low_stock=low_stock,
        search=search,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [InventoryResponse.model_validate(r) for r in records],
    }


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory(
    inv_in: InventoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify locator exists and user has access
    locator = locator_crud.get_locator(db, inv_in.locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")
    # Verify item exists
    item = item_crud.get_item(db, inv_in.item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    # Check for duplicate inventory record
    existing = checkout_crud.get_inventory_by_location(
        db, inv_in.item_id, inv_in.locator_id, inv_in.sublocator_id,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This item already has an inventory record for this location and shelf. "
                   "Use the adjust endpoint to change the quantity instead.",
        )
    return checkout_crud.create_inventory(db, inv_in)


@router.post("/quick-add", response_model=QuickAddResponse, status_code=status.HTTP_201_CREATED)
def quick_add_inventory(
    req: QuickAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate: must provide item_id or item_name
    if req.item_id is None and not req.item_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either item_id or item_name must be provided.",
        )

    # Verify locator exists
    locator = locator_crud.get_locator(db, req.locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")

    # Verify sublocator if provided
    if req.sublocator_id is not None:
        sub = locator_crud.get_sublocator(db, req.sublocator_id)
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sublocator not found")

    item_created = False

    if req.item_id is not None:
        # Use existing item by ID
        item = item_crud.get_item(db, req.item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    else:
        # Look up by name first, create if not found
        item = item_crud.get_item_by_name(db, req.item_name)
        if not item:
            if req.category_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="category_id is required when creating a new item.",
                )
            category = db.query(Category).filter(Category.id == req.category_id).first()
            if not category:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
            item = Item(
                name=req.item_name,
                category_id=req.category_id,
                unit_of_measure=req.unit_of_measure,
            )
            db.add(item)
            db.flush()
            item_created = True

    # Upsert inventory: add to existing or create new
    existing_inv = checkout_crud.get_inventory_by_location(
        db, item.id, req.locator_id, req.sublocator_id,
    )
    if existing_inv:
        existing_inv.quantity += req.quantity
        if req.min_quantity and existing_inv.min_quantity == 0:
            existing_inv.min_quantity = req.min_quantity
        db.commit()
        db.refresh(existing_inv)
        inv = existing_inv
    else:
        inv_data = InventoryCreate(
            item_id=item.id,
            locator_id=req.locator_id,
            sublocator_id=req.sublocator_id,
            quantity=req.quantity,
            min_quantity=req.min_quantity,
        )
        inv = checkout_crud.create_inventory(db, inv_data)

    # Reload with joins for response
    inv = checkout_crud.get_inventory(db, inv.id)

    return QuickAddResponse(
        inventory=InventoryResponse.model_validate(inv),
        item_created=item_created,
        item=NestedItem.model_validate(item),
    )


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = checkout_crud.get_inventory(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    return inv


@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(
    inventory_id: int,
    inv_in: InventoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = checkout_crud.get_inventory(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    return checkout_crud.update_inventory(db, inv, inv_in)


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = checkout_crud.get_inventory(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    # Check for open checkouts
    open_checkouts = db.query(Checkout).filter(
        Checkout.inventory_id == inventory_id,
        Checkout.status == "active",
    ).first()
    if open_checkouts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete inventory with open checkouts.",
        )
    checkout_crud.delete_inventory(db, inv)


@router.post("/{inventory_id}/adjust", response_model=InventoryResponse)
def adjust_inventory(
    inventory_id: int,
    adj: InventoryAdjust,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = checkout_crud.get_inventory(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    try:
        return checkout_crud.adjust_inventory(db, inv, adj, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
