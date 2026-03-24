from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import checkout as checkout_crud
from app.crud import locator as locator_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.checkout import (
    CheckoutCreate, CheckoutResponse, CheckoutReturn, CheckoutExtend,
    CheckoutSummary,
)
from app.models.user import User

router = APIRouter(prefix="/checkouts", tags=["checkouts"])


def _check_checkout_access(db: Session, checkout, current_user: User):
    """Check if current user has access to this checkout."""
    if current_user.role == "admin":
        return
    if checkout.user_id == current_user.id:
        return
    # Check if user owns the locator
    inv = checkout_crud.get_inventory(db, checkout.inventory_id)
    if inv:
        locator = locator_crud.get_locator(db, inv.locator_id)
        if locator and locator.user_id == current_user.id:
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("/summary", response_model=CheckoutSummary)
def checkout_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = None if current_user.role == "admin" else current_user.id
    return checkout_crud.get_checkout_summary(db, user_id=user_id)


@router.get("/overdue", response_model=dict)
def list_overdue(
    pagination: dict = Depends(pagination_params),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = None if current_user.role == "admin" else current_user.id
    total, checkouts = checkout_crud.get_overdue_checkouts(
        db, skip=pagination["skip"], limit=pagination["limit"], user_id=user_id,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [CheckoutResponse.model_validate(c) for c in checkouts],
    }


@router.post("", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
def create_checkout(
    checkout_in: CheckoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only admins can checkout on behalf of others
    if checkout_in.user_id and checkout_in.user_id != current_user.id:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can checkout on behalf of others",
            )
    try:
        return checkout_crud.create_checkout(db, checkout_in, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=dict)
def list_checkouts(
    pagination: dict = Depends(pagination_params),
    status_filter: str | None = None,
    user_id: int | None = None,
    inventory_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Teachers can only see their own checkouts
    if current_user.role != "admin":
        user_id = current_user.id
    total, checkouts = checkout_crud.get_checkouts(
        db, skip=pagination["skip"], limit=pagination["limit"],
        user_id=user_id, inventory_id=inventory_id, status=status_filter,
        sort_by=pagination["sort_by"], sort_order=pagination["sort_order"],
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [CheckoutResponse.model_validate(c) for c in checkouts],
    }


@router.get("/{checkout_id}", response_model=CheckoutResponse)
def get_checkout(
    checkout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkout = checkout_crud.get_checkout(db, checkout_id)
    if not checkout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkout not found")
    _check_checkout_access(db, checkout, current_user)
    return checkout


@router.post("/{checkout_id}/return", response_model=CheckoutResponse)
def return_checkout(
    checkout_id: int,
    return_in: CheckoutReturn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkout = checkout_crud.get_checkout(db, checkout_id)
    if not checkout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkout not found")
    _check_checkout_access(db, checkout, current_user)
    try:
        return checkout_crud.return_checkout(db, checkout, return_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{checkout_id}/extend", response_model=CheckoutResponse)
def extend_checkout(
    checkout_id: int,
    extend_in: CheckoutExtend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkout = checkout_crud.get_checkout(db, checkout_id)
    if not checkout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkout not found")
    _check_checkout_access(db, checkout, current_user)
    try:
        return checkout_crud.extend_checkout(db, checkout, extend_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
