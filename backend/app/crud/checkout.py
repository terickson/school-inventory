import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session, joinedload

from app.models.checkout import Inventory, Checkout, AuditLog
from app.schemas.checkout import (
    InventoryCreate, InventoryUpdate, InventoryAdjust,
    CheckoutCreate, CheckoutReturn, CheckoutExtend,
)
from app.config import settings


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
    low_stock: bool = False,
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
    total = query.count()
    records = query.offset(skip).limit(limit).all()
    return total, records


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
    status: str | None = None,
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
    checkouts = query.order_by(Checkout.created_at.desc()).offset(skip).limit(limit).all()
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

    due_date = checkout_in.due_date
    if due_date is None:
        due_date = datetime.now(timezone.utc) + timedelta(days=settings.default_checkout_days)

    checkout = Checkout(
        inventory_id=checkout_in.inventory_id,
        user_id=checkout_user_id,
        quantity=checkout_in.quantity,
        due_date=due_date,
        notes=checkout_in.notes,
        status="active",
    )
    inv.quantity -= checkout_in.quantity
    db.add(checkout)
    db.commit()
    db.refresh(checkout)
    return checkout


def return_checkout(db: Session, checkout: Checkout, return_in: CheckoutReturn) -> Checkout:
    """Atomic return: update checkout status and increment inventory."""
    if checkout.status == "returned":
        raise ValueError("Checkout already returned")

    return_qty = return_in.quantity if return_in.quantity is not None else checkout.quantity

    if return_qty > checkout.quantity:
        raise ValueError(
            f"Cannot return more than checked out: returning {return_qty}, checked out {checkout.quantity}"
        )

    inv = db.query(Inventory).filter(Inventory.id == checkout.inventory_id).with_for_update().first()
    inv.quantity += return_qty
    checkout.status = "returned"
    checkout.return_date = datetime.now(timezone.utc)
    if return_in.notes:
        checkout.notes = (checkout.notes or "") + f" | Return: {return_in.notes}"
    db.commit()
    db.refresh(checkout)
    return checkout


def extend_checkout(db: Session, checkout: Checkout, extend_in: CheckoutExtend) -> Checkout:
    if checkout.status == "returned":
        raise ValueError("Cannot extend a returned checkout")
    checkout.due_date = extend_in.due_date
    if checkout.status == "overdue" and extend_in.due_date > datetime.now(timezone.utc):
        checkout.status = "active"
    db.commit()
    db.refresh(checkout)
    return checkout


def get_overdue_checkouts(db: Session, skip: int = 0, limit: int = 20, user_id: int | None = None):
    now = datetime.now(timezone.utc)
    query = db.query(Checkout).options(
        joinedload(Checkout.inventory).joinedload(Inventory.item),
        joinedload(Checkout.inventory).joinedload(Inventory.locator),
        joinedload(Checkout.user),
    ).filter(
        Checkout.status.in_(["active", "overdue"]),
        Checkout.due_date < now,
    )
    if user_id is not None:
        query = query.filter(Checkout.user_id == user_id)
    # Mark overdue
    db.query(Checkout).filter(
        Checkout.status == "active",
        Checkout.due_date < now,
    ).update({"status": "overdue"}, synchronize_session="fetch")
    db.commit()
    total = query.count()
    checkouts = query.offset(skip).limit(limit).all()
    return total, checkouts


def get_checkout_summary(db: Session, user_id: int | None = None):
    from app.models.item import Item
    total_items = db.query(Item).count()

    checkout_query = db.query(Checkout).filter(Checkout.status == "active")
    if user_id is not None:
        checkout_query = checkout_query.filter(Checkout.user_id == user_id)
    active_checkouts = checkout_query.count()

    now = datetime.now(timezone.utc)
    overdue_query = db.query(Checkout).filter(
        Checkout.status.in_(["active", "overdue"]),
        Checkout.due_date < now,
    )
    if user_id is not None:
        overdue_query = overdue_query.filter(Checkout.user_id == user_id)
    overdue_items = overdue_query.count()

    low_stock_items = db.query(Inventory).filter(
        Inventory.quantity <= Inventory.min_quantity,
        Inventory.min_quantity > 0,
    ).count()

    return {
        "total_items": total_items,
        "active_checkouts": active_checkouts,
        "overdue_count": overdue_items,
        "low_stock_count": low_stock_items,
    }
