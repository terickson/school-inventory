from sqlalchemy.orm import Session, joinedload

from app.models.item import Category, Item
from app.schemas.item import (
    CategoryCreate, CategoryUpdate,
    ItemCreate, ItemUpdate,
)


# --- Categories ---

def get_category(db: Session, category_id: int) -> Category | None:
    return db.query(Category).filter(Category.id == category_id).first()


def get_category_by_name(db: Session, name: str) -> Category | None:
    return db.query(Category).filter(Category.name == name).first()


def get_categories(db: Session, skip: int = 0, limit: int = 100, search: str | None = None, sort_by: str | None = None, sort_order: str = "asc"):
    query = db.query(Category)
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    total = query.count()
    if sort_by and hasattr(Category, sort_by):
        col = getattr(Category, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    categories = query.offset(skip).limit(limit).all()
    return total, categories


def create_category(db: Session, category_in: CategoryCreate) -> Category:
    category = Category(name=category_in.name, description=category_in.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category: Category, category_in: CategoryUpdate) -> Category:
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()


# --- Items ---

def get_item(db: Session, item_id: int) -> Item | None:
    return db.query(Item).filter(Item.id == item_id).first()


def get_item_by_name(db: Session, name: str) -> Item | None:
    return db.query(Item).filter(Item.name == name).first()


def get_items(db: Session, skip: int = 0, limit: int = 20, search: str | None = None, category_id: int | None = None, sort_by: str | None = None, sort_order: str = "asc"):
    query = db.query(Item).options(joinedload(Item.category))
    if search:
        query = query.filter(Item.name.ilike(f"%{search}%"))
    if category_id is not None:
        query = query.filter(Item.category_id == category_id)
    total = query.count()
    if sort_by and hasattr(Item, sort_by):
        col = getattr(Item, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    items = query.offset(skip).limit(limit).all()
    return total, items


def create_item(db: Session, item_in: ItemCreate) -> Item:
    item = Item(
        name=item_in.name,
        description=item_in.description,
        category_id=item_in.category_id,
        unit_of_measure=item_in.unit_of_measure,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item: Item, item_in: ItemUpdate) -> Item:
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item: Item) -> None:
    db.delete(item)
    db.commit()
