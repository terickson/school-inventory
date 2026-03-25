from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import locator as locator_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.locator import SublocatorCreate, SublocatorUpdate, SublocatorResponse
from app.models.user import User
from app.models.checkout import Inventory

router = APIRouter(prefix="/locators/{locator_id}/sublocators", tags=["sublocators"])


def _get_locator_or_404(db: Session, locator_id: int, current_user: User):
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")
    if current_user.role != "admin" and locator.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return locator


@router.get("", response_model=dict)
def list_sublocators(
    locator_id: int,
    pagination: dict = Depends(pagination_params),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_locator_or_404(db, locator_id, current_user)
    total, sublocators = locator_crud.get_sublocators(
        db, locator_id=locator_id, skip=pagination["skip"], limit=pagination["limit"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [SublocatorResponse.model_validate(s) for s in sublocators],
    }


@router.post("", response_model=SublocatorResponse, status_code=status.HTTP_201_CREATED)
def create_sublocator(
    locator_id: int,
    sub_in: SublocatorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_locator_or_404(db, locator_id, current_user)
    if locator_crud.get_sublocator_by_name(db, locator_id, sub_in.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A shelf named '{sub_in.name}' already exists in this location. Please choose a different name.",
        )
    return locator_crud.create_sublocator(db, sub_in, locator_id)


@router.get("/{sublocator_id}", response_model=SublocatorResponse)
def get_sublocator(
    locator_id: int,
    sublocator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_locator_or_404(db, locator_id, current_user)
    sub = locator_crud.get_sublocator(db, sublocator_id)
    if not sub or sub.locator_id != locator_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sublocator not found")
    return sub


@router.patch("/{sublocator_id}", response_model=SublocatorResponse)
def update_sublocator(
    locator_id: int,
    sublocator_id: int,
    sub_in: SublocatorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_locator_or_404(db, locator_id, current_user)
    sub = locator_crud.get_sublocator(db, sublocator_id)
    if not sub or sub.locator_id != locator_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sublocator not found")
    if sub_in.name and sub_in.name != sub.name:
        existing = locator_crud.get_sublocator_by_name(db, locator_id, sub_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A shelf named '{sub_in.name}' already exists in this location. Please choose a different name.",
            )
    return locator_crud.update_sublocator(db, sub, sub_in)


@router.delete("/{sublocator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sublocator(
    locator_id: int,
    sublocator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_locator_or_404(db, locator_id, current_user)
    sub = locator_crud.get_sublocator(db, sublocator_id)
    if not sub or sub.locator_id != locator_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sublocator not found")
    has_inventory = db.query(Inventory).filter(Inventory.sublocator_id == sublocator_id).first()
    if has_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete sublocator with existing inventory.",
        )
    locator_crud.delete_sublocator(db, sub)
