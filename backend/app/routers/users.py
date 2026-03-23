from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import user as user_crud
from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.pagination import pagination_params
from app.schemas.user import UserCreate, UserUpdate, UserSelfUpdate, UserResponse, PasswordReset
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=dict)
def list_users(
    pagination: dict = Depends(pagination_params),
    role: str | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total, users = user_crud.get_users(
        db, skip=pagination["skip"], limit=pagination["limit"],
        role=role, is_active=is_active,
    )
    return {
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": [UserResponse.model_validate(u) for u in users],
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_crud.get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if user_crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    return user_crud.create_user(db, user_in)


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    user_in: UserSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_in.email and user_in.email != current_user.email:
        if user_crud.get_user_by_email(db, user_in.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    return user_crud.update_user_self(db, current_user, user_in)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_in.email and user_in.email != user.email:
        if user_crud.get_user_by_email(db, user_in.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    return user_crud.update_user(db, user, user_in)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_crud.soft_delete_user(db, user)


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_user_password(
    user_id: int,
    body: PasswordReset,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user_crud.reset_password(db, user, body.new_password)
