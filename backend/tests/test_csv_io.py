import io
import csv
from app.models.item import Item
from app.models.checkout import Inventory


class TestCsvExport:
    def test_export_returns_csv(self, client, admin_headers, inventory_record):
        resp = client.get(
            f"/api/v1/inventory/export?locator_id={inventory_record.locator_id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "attachment" in resp.headers["content-disposition"]

        reader = csv.reader(io.StringIO(resp.text))
        rows = list(reader)
        # Header + 1 data row
        assert len(rows) == 2
        assert rows[0] == ["Item Name", "Category", "Shelf", "Quantity", "Min Quantity", "Unit"]
        assert rows[1][0] == "Test Item"  # item name
        assert rows[1][3] == "100"  # quantity

    def test_export_with_sublocator_filter(self, client, admin_headers, inventory_record, db, item, locator):
        # Create a second inventory record without sublocator
        inv2 = Inventory(
            item_id=item.id,
            locator_id=locator.id,
            sublocator_id=None,
            quantity=50,
        )
        db.add(inv2)
        db.commit()

        # Export with sublocator filter should return only 1 record
        resp = client.get(
            f"/api/v1/inventory/export?locator_id={locator.id}&sublocator_id={inventory_record.sublocator_id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        reader = csv.reader(io.StringIO(resp.text))
        rows = list(reader)
        assert len(rows) == 2  # Header + 1 data row

    def test_export_empty_location(self, client, admin_headers, locator):
        resp = client.get(
            f"/api/v1/inventory/export?locator_id={locator.id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        reader = csv.reader(io.StringIO(resp.text))
        rows = list(reader)
        assert len(rows) == 1  # Header only

    def test_export_requires_auth(self, client, locator):
        resp = client.get(f"/api/v1/inventory/export?locator_id={locator.id}")
        assert resp.status_code == 401

    def test_export_nonexistent_locator(self, client, admin_headers):
        resp = client.get("/api/v1/inventory/export?locator_id=99999", headers=admin_headers)
        assert resp.status_code == 404


class TestCsvImport:
    def _make_csv(self, rows: list[list[str]]) -> bytes:
        output = io.StringIO()
        writer = csv.writer(output)
        for row in rows:
            writer.writerow(row)
        return output.getvalue().encode("utf-8")

    def test_import_creates_items_and_inventory(self, client, admin_headers, locator, category):
        csv_data = self._make_csv([
            ["Item Name", "Category", "Shelf", "Quantity", "Min Quantity", "Unit"],
            ["Imported Widget", category.name, "New Shelf", "10", "2", "unit"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 1
        assert data["updated"] == 0
        assert data["errors"] == []

    def test_import_updates_existing_inventory(self, client, admin_headers, inventory_record, locator, db):
        # Get the item and sublocator names for the CSV
        db.refresh(inventory_record)
        item = db.query(Item).filter(Item.id == inventory_record.item_id).first()

        csv_data = self._make_csv([
            ["Item Name", "Category", "Shelf", "Quantity", "Min Quantity", "Unit"],
            [item.name, "", "Shelf 1", "25", "5", "unit"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["updated"] == 1

        # Verify quantity was replaced, not added
        db.refresh(inventory_record)
        assert inventory_record.quantity == 25

    def test_import_missing_required_columns(self, client, admin_headers, locator):
        csv_data = self._make_csv([
            ["Name", "Qty"],
            ["Widget", "5"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 400

    def test_import_bad_rows_partial_success(self, client, admin_headers, locator, category):
        csv_data = self._make_csv([
            ["Item Name", "Category", "Quantity", "Unit"],
            ["Good Item", category.name, "5", "unit"],
            ["", "", "3", "unit"],  # Empty name — should be skipped
            ["Bad Qty Item", category.name, "abc", "unit"],  # Bad quantity — should be skipped
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 1
        assert len(data["errors"]) == 2

    def test_import_creates_sublocators(self, client, admin_headers, locator, category, db):
        csv_data = self._make_csv([
            ["Item Name", "Category", "Shelf", "Quantity", "Unit"],
            ["Shelf Creator Item", category.name, "Auto Created Shelf", "3", "unit"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        assert resp.json()["created"] == 1

        # Verify sublocator was created
        from app.models.locator import Sublocator
        sub = db.query(Sublocator).filter(
            Sublocator.locator_id == locator.id,
            Sublocator.name == "Auto Created Shelf",
        ).first()
        assert sub is not None

    def test_import_requires_auth(self, client, locator):
        csv_data = self._make_csv([
            ["Item Name", "Quantity"],
            ["Widget", "5"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        )
        assert resp.status_code == 401

    def test_import_nonexistent_locator(self, client, admin_headers):
        csv_data = self._make_csv([
            ["Item Name", "Quantity"],
            ["Widget", "5"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": "99999"},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 404

    def test_import_new_item_without_category_errors(self, client, admin_headers, locator):
        csv_data = self._make_csv([
            ["Item Name", "Quantity"],
            ["Orphan Item No Cat", "5"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 0
        assert len(data["errors"]) == 1
        assert "Category" in data["errors"][0]["error"]

    def test_import_negative_quantity_errors(self, client, admin_headers, locator, category):
        csv_data = self._make_csv([
            ["Item Name", "Category", "Quantity"],
            ["Negative Item", category.name, "-5"],
        ])
        resp = client.post(
            "/api/v1/inventory/import",
            data={"locator_id": str(locator.id)},
            files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
            headers={"Authorization": admin_headers["Authorization"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["errors"]) == 1
        assert "negative" in data["errors"][0]["error"].lower()
