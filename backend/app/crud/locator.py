from sqlalchemy.orm import Session

from app.models.locator import Locator, Sublocator
from app.schemas.locator import (
    LocatorCreate, LocatorUpdate,
    SublocatorCreate, SublocatorUpdate,
)


# --- Locators ---

def get_locator(db: Session, locator_id: int) -> Locator | None:
    return db.query(Locator).filter(Locator.id == locator_id).first()


def get_locators(db: Session, skip: int = 0, limit: int = 20, user_id: int | None = None, sort_by: str | None = None, sort_order: str = "asc"):
    query = db.query(Locator)
    if user_id is not None:
        query = query.filter(Locator.user_id == user_id)
    total = query.count()
    if sort_by and hasattr(Locator, sort_by):
        col = getattr(Locator, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    locators = query.offset(skip).limit(limit).all()
    return total, locators


def create_locator(db: Session, locator_in: LocatorCreate, user_id: int) -> Locator:
    locator = Locator(
        name=locator_in.name,
        description=locator_in.description,
        user_id=user_id,
    )
    db.add(locator)
    db.commit()
    db.refresh(locator)
    return locator


def update_locator(db: Session, locator: Locator, locator_in: LocatorUpdate) -> Locator:
    update_data = locator_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(locator, field, value)
    db.commit()
    db.refresh(locator)
    return locator


def delete_locator(db: Session, locator: Locator) -> None:
    db.delete(locator)
    db.commit()


# --- Sublocators ---

def get_sublocator(db: Session, sublocator_id: int) -> Sublocator | None:
    return db.query(Sublocator).filter(Sublocator.id == sublocator_id).first()


def get_sublocators(db: Session, locator_id: int, skip: int = 0, limit: int = 20):
    query = db.query(Sublocator).filter(Sublocator.locator_id == locator_id)
    total = query.count()
    sublocators = query.offset(skip).limit(limit).all()
    return total, sublocators


def create_sublocator(db: Session, sublocator_in: SublocatorCreate, locator_id: int) -> Sublocator:
    sublocator = Sublocator(
        name=sublocator_in.name,
        description=sublocator_in.description,
        locator_id=locator_id,
    )
    db.add(sublocator)
    db.commit()
    db.refresh(sublocator)
    return sublocator


def update_sublocator(db: Session, sublocator: Sublocator, sublocator_in: SublocatorUpdate) -> Sublocator:
    update_data = sublocator_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sublocator, field, value)
    db.commit()
    db.refresh(sublocator)
    return sublocator


def delete_sublocator(db: Session, sublocator: Sublocator) -> None:
    db.delete(sublocator)
    db.commit()
