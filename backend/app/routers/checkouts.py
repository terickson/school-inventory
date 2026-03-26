from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import checkout as checkout_crud
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.schemas.checkout import (
    CheckoutCreate, CheckoutResponse, CheckoutReturn,
    CheckoutSummary,
)
from app.models.user import User

router = APIRouter(prefix="/checkouts", tags=["checkouts"])


@router.get("/summary", response_model=CheckoutSummary)
def checkout_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return checkout_crud.get_checkout_summary(db, user_id=None)


@router.post("", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
def create_checkout(
    checkout_in: CheckoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return checkout_crud.create_checkout(db, checkout_in, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=dict)
def list_checkouts(
    pagination: dict = Depends(pagination_params),
    status_filter: str | None = Query(None, alias="status"),
    user_id: int | None = None,
    inventory_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
    try:
        return checkout_crud.return_checkout(db, checkout, return_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


