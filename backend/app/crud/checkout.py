import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload

from app.models.checkout import Inventory, Checkout, AuditLog
from app.models.item import Item
from app.schemas.checkout import (
    InventoryCreate, InventoryUpdate, InventoryAdjust,
    CheckoutCreate, CheckoutReturn,
)


# --- Inventory ---

def get_inventory(db: Session, inventory_id: int) -> Inventory | None:
    return db.query(Inventory).options(
        joinedload(Inventory.item),
        joinedload(Inventory.locator),
        joinedload(Inventory.sublocator),
    ).filter(Inventory.id == inventory_id).first()


def get_inventory_records(
    db: Session, skip: int = 0, limit: int = 20,
    locator_id: int | None = None, item_id: int | None = None,
    low_stock: bool = False, search: str | None = None,
    sort_by: str | None = None, sort_order: str = "asc",
):
    query = db.query(Inventory).options(
        joinedload(Inventory.item),
        joinedload(Inventory.locator),
        joinedload(Inventory.sublocator),
    )
    if locator_id is not None:
        query = query.filter(Inventory.locator_id == locator_id)
    if item_id is not None:
        query = query.filter(Inventory.item_id == item_id)
    if low_stock:
        query = query.filter(Inventory.quantity <= Inventory.min_quantity, Inventory.min_quantity > 0)
    if search:
        query = query.join(Item).filter(Item.name.ilike(f"%{search}%"))
    total = query.count()
    if sort_by and hasattr(Inventory, sort_by):
        col = getattr(Inventory, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    records = query.offset(skip).limit(limit).all()
    return total, records


def get_inventory_by_location(
    db: Session, item_id: int, locator_id: int, sublocator_id: int | None,
) -> Inventory | None:
    query = db.query(Inventory).filter(
        Inventory.item_id == item_id,
        Inventory.locator_id == locator_id,
    )
    if sublocator_id is not None:
        query = query.filter(Inventory.sublocator_id == sublocator_id)
    else:
        query = query.filter(Inventory.sublocator_id.is_(None))
    return query.first()


def create_inventory(db: Session, inv_in: InventoryCreate) -> Inventory:
    inv = Inventory(
        item_id=inv_in.item_id,
        locator_id=inv_in.locator_id,
        sublocator_id=inv_in.sublocator_id,
        quantity=inv_in.quantity,
        min_quantity=inv_in.min_quantity,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


def update_inventory(db: Session, inv: Inventory, inv_in: InventoryUpdate) -> Inventory:
    update_data = inv_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


def delete_inventory(db: Session, inv: Inventory) -> None:
    db.delete(inv)
    db.commit()


def adjust_inventory(db: Session, inv: Inventory, adj: InventoryAdjust, changed_by: int) -> Inventory:
    old_qty = inv.quantity
    new_qty = old_qty + adj.adjustment
    if new_qty < 0:
        raise ValueError(f"Adjustment would result in negative quantity: {new_qty}")
    inv.quantity = new_qty
    audit = AuditLog(
        table_name="inventory",
        record_id=inv.id,
        action="UPDATE",
        changed_by=changed_by,
        old_values=json.dumps({"quantity": old_qty}),
        new_values=json.dumps({"quantity": new_qty, "reason": adj.reason}),
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)
    return inv


# --- Checkouts ---

def get_checkout(db: Session, checkout_id: int) -> Checkout | None:
    return db.query(Checkout).filter(Checkout.id == checkout_id).first()


def get_checkouts(
    db: Session, skip: int = 0, limit: int = 20,
    user_id: int | None = None, inventory_id: int | None = None,
    status: str | None = None, sort_by: str | None = None, sort_order: str = "asc",
):
    query = db.query(Checkout).options(
        joinedload(Checkout.inventory).joinedload(Inventory.item),
        joinedload(Checkout.inventory).joinedload(Inventory.locator),
        joinedload(Checkout.user),
    )
    if user_id is not None:
        query = query.filter(Checkout.user_id == user_id)
    if inventory_id is not None:
        query = query.filter(Checkout.inventory_id == inventory_id)
    if status is not None:
        query = query.filter(Checkout.status == status)
    total = query.count()
    if sort_by and hasattr(Checkout, sort_by):
        col = getattr(Checkout, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    else:
        query = query.order_by(Checkout.created_at.desc())
    checkouts = query.offset(skip).limit(limit).all()
    return total, checkouts


def create_checkout(db: Session, checkout_in: CheckoutCreate, user_id: int) -> Checkout:
    """Atomic checkout: create checkout record and decrement inventory."""
    inv = db.query(Inventory).filter(Inventory.id == checkout_in.inventory_id).with_for_update().first()
    if inv is None:
        raise ValueError("Inventory record not found")
    if inv.quantity < checkout_in.quantity:
        raise ValueError(
            f"Insufficient stock: requested {checkout_in.quantity}, available {inv.quantity}"
        )

    checkout_user_id = checkout_in.user_id if checkout_in.user_id else user_id

    checkout = Checkout(
        inventory_id=checkout_in.inventory_id,
        user_id=checkout_user_id,
        quantity=checkout_in.quantity,
        notes=checkout_in.notes,
        status="active",
    )
    inv.quantity -= checkout_in.quantity
    db.add(checkout)
    db.commit()
    db.refresh(checkout)
    return checkout


def return_checkout(db: Session, checkout: Checkout, return_in: CheckoutReturn) -> Checkout:
    """Atomic return: update checkout status and increment inventory. Supports partial returns."""
    if checkout.status == "returned":
        raise ValueError("Checkout already returned")

    remaining = checkout.quantity - checkout.returned_quantity
    return_qty = return_in.quantity if return_in.quantity is not None else remaining

    if return_qty > remaining:
        raise ValueError(
            f"Cannot return more than remaining: returning {return_qty}, remaining {remaining}"
        )

    inv = db.query(Inventory).filter(Inventory.id == checkout.inventory_id).with_for_update().first()
    inv.quantity += return_qty
    checkout.returned_quantity += return_qty
    if checkout.returned_quantity == checkout.quantity:
        checkout.status = "returned"
        checkout.return_date = datetime.now(timezone.utc)
    if return_in.notes:
        checkout.notes = (checkout.notes or "") + f" | Return: {return_in.notes}"
    db.commit()
    db.refresh(checkout)
    return checkout


def get_checkout_summary(db: Session, user_id: int | None = None):
    total_items = db.query(Item).count()

    checkout_query = db.query(Checkout).filter(Checkout.status == "active")
    if user_id is not None:
        checkout_query = checkout_query.filter(Checkout.user_id == user_id)
    active_checkouts = checkout_query.count()

    low_stock_items = db.query(Inventory).filter(
        Inventory.quantity <= Inventory.min_quantity,
        Inventory.min_quantity > 0,
    ).count()

    return {
        "total_items": total_items,
        "active_checkouts": active_checkouts,
        "low_stock_count": low_stock_items,
    }
