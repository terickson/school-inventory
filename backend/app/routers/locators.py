from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import locator as locator_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.locator import LocatorCreate, LocatorUpdate, LocatorResponse
from app.models.user import User
from app.models.checkout import Inventory

router = APIRouter(prefix="/locators", tags=["locators"])


@router.get("", response_model=dict)
def list_locators(
    pagination: dict = Depends(pagination_params),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, locators = locator_crud.get_locators(
        db, skip=pagination["skip"], limit=pagination["limit"], user_id=None,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [LocatorResponse.model_validate(loc) for loc in locators],
    }


@router.post("", response_model=LocatorResponse, status_code=status.HTTP_201_CREATED)
def create_locator(
    locator_in: LocatorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if locator_crud.get_locator_by_name(db, current_user.id, locator_in.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a location named '{locator_in.name}'. Please choose a different name.",
        )
    return locator_crud.create_locator(db, locator_in, current_user.id)


@router.get("/{locator_id}", response_model=LocatorResponse)
def get_locator(
    locator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")
    return locator


@router.patch("/{locator_id}", response_model=LocatorResponse)
def update_locator(
    locator_id: int,
    locator_in: LocatorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")
    if locator_in.name and locator_in.name != locator.name:
        existing = locator_crud.get_locator_by_name(db, locator.user_id, locator_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You already have a location named '{locator_in.name}'. Please choose a different name.",
            )
    return locator_crud.update_locator(db, locator, locator_in)


@router.delete("/{locator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_locator(
    locator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")
    # Check for existing inventory
    has_inventory = db.query(Inventory).filter(Inventory.locator_id == locator_id).first()
    if has_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete locator with existing inventory. Remove or reassign items first.",
        )
    locator_crud.delete_locator(db, locator)
