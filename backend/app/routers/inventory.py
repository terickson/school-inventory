from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import checkout as checkout_crud
from app.crud import locator as locator_crud
from app.crud import item as item_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.checkout import InventoryCreate, InventoryUpdate, InventoryAdjust, InventoryResponse
from app.models.user import User
from app.models.checkout import Checkout

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _check_inventory_access(db: Session, inv, current_user: User):
    locator = locator_crud.get_locator(db, inv.locator_id)
    if current_user.role != "admin" and locator and locator.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("", response_model=dict)
def list_inventory(
    pagination: dict = Depends(pagination_params),
    locator_id: int | None = None,
    item_id: int | None = None,
    low_stock: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, records = checkout_crud.get_inventory_records(
        db, skip=pagination["skip"], limit=pagination["limit"],
        locator_id=locator_id, item_id=item_id, low_stock=low_stock,
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
    if current_user.role != "admin" and locator.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    # Verify item exists
    item = item_crud.get_item(db, inv_in.item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return checkout_crud.create_inventory(db, inv_in)


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = checkout_crud.get_inventory(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    _check_inventory_access(db, inv, current_user)
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
    _check_inventory_access(db, inv, current_user)
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
    _check_inventory_access(db, inv, current_user)
    # Check for open checkouts
    open_checkouts = db.query(Checkout).filter(
        Checkout.inventory_id == inventory_id,
        Checkout.status.in_(["active", "overdue"]),
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
    _check_inventory_access(db, inv, current_user)
    try:
        return checkout_crud.adjust_inventory(db, inv, adj, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
