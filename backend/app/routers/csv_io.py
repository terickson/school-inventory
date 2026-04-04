import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.item import Category, Item
from app.models.checkout import Inventory
from app.models.locator import Locator, Sublocator
from app.crud import checkout as checkout_crud
from app.crud import item as item_crud
from app.crud import locator as locator_crud

router = APIRouter(prefix="/inventory", tags=["inventory"])


class ImportRowError(BaseModel):
    row: int
    item_name: str | None = None
    error: str


class ImportResult(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: list[ImportRowError]


@router.get("/export")
def export_inventory_csv(
    locator_id: int,
    sublocator_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify locator exists
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")

    query = db.query(Inventory).options(
        joinedload(Inventory.item).joinedload(Item.category),
        joinedload(Inventory.sublocator),
    ).filter(Inventory.locator_id == locator_id)

    if sublocator_id is not None:
        query = query.filter(Inventory.sublocator_id == sublocator_id)

    records = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Item Name", "Category", "Shelf", "Quantity", "Min Quantity", "Unit"])

    for rec in records:
        writer.writerow([
            rec.item.name if rec.item else "",
            rec.item.category.name if rec.item and rec.item.category else "",
            rec.sublocator.name if rec.sublocator else "",
            rec.quantity,
            rec.min_quantity,
            rec.item.unit_of_measure if rec.item else "unit",
        ])

    output.seek(0)
    safe_name = locator.name.replace(" ", "_").replace("/", "_")
    filename = f"inventory_{safe_name}_{date.today().isoformat()}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=ImportResult)
def import_inventory_csv(
    file: UploadFile = File(...),
    locator_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify locator exists
    locator = locator_crud.get_locator(db, locator_id)
    if not locator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Locator not found")

    # Read and parse CSV
    try:
        content = file.file.read().decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded CSV.",
        )

    reader = csv.DictReader(io.StringIO(content))

    if not reader.fieldnames or "Item Name" not in reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must have an 'Item Name' column.",
        )
    if "Quantity" not in reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must have a 'Quantity' column.",
        )

    created = 0
    updated = 0
    errors: list[ImportRowError] = []

    for row_num, row in enumerate(reader, start=2):  # Row 1 is header
        item_name = (row.get("Item Name") or "").strip()
        if not item_name:
            errors.append(ImportRowError(row=row_num, item_name=None, error="Item Name is empty"))
            continue

        # Parse quantity
        try:
            quantity = int(row.get("Quantity", "0").strip())
        except ValueError:
            errors.append(ImportRowError(row=row_num, item_name=item_name, error="Invalid quantity"))
            continue

        if quantity < 0:
            errors.append(ImportRowError(row=row_num, item_name=item_name, error="Quantity cannot be negative"))
            continue

        # Parse min_quantity
        min_quantity = 0
        min_qty_str = (row.get("Min Quantity") or "0").strip()
        if min_qty_str:
            try:
                min_quantity = int(min_qty_str)
            except ValueError:
                pass  # Default to 0

        unit = (row.get("Unit") or "unit").strip() or "unit"
        category_name = (row.get("Category") or "").strip()
        shelf_name = (row.get("Shelf") or "").strip()

        try:
            # Resolve or create category
            category = None
            if category_name:
                category = item_crud.get_category_by_name(db, category_name)
                if not category:
                    category = Category(name=category_name)
                    db.add(category)
                    db.flush()

            # Resolve or create item
            item = item_crud.get_item_by_name(db, item_name)
            if not item:
                if not category:
                    errors.append(ImportRowError(
                        row=row_num, item_name=item_name,
                        error="Item not found and no Category provided to create it",
                    ))
                    continue
                item = Item(
                    name=item_name,
                    category_id=category.id,
                    unit_of_measure=unit,
                )
                db.add(item)
                db.flush()

            # Resolve sublocator
            sublocator_id = None
            if shelf_name:
                sub = locator_crud.get_sublocator_by_name(db, locator_id, shelf_name)
                if not sub:
                    sub = Sublocator(name=shelf_name, locator_id=locator_id)
                    db.add(sub)
                    db.flush()
                sublocator_id = sub.id

            # Upsert inventory record
            existing = checkout_crud.get_inventory_by_location(
                db, item.id, locator_id, sublocator_id,
            )
            if existing:
                existing.quantity = quantity
                existing.min_quantity = min_quantity
                updated += 1
            else:
                db.add(Inventory(
                    item_id=item.id,
                    locator_id=locator_id,
                    sublocator_id=sublocator_id,
                    quantity=quantity,
                    min_quantity=min_quantity,
                ))
                created += 1

        except Exception as e:
            errors.append(ImportRowError(row=row_num, item_name=item_name, error=str(e)))
            continue

    db.commit()

    total_rows = (row_num if 'row_num' in dir() else 1) - 1  # noqa: F821
    return ImportResult(
        total_rows=created + updated + len(errors),
        created=created,
        updated=updated,
        errors=errors,
    )
