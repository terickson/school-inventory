class TestInventoryEndpoints:
    def test_create_inventory(self, client, admin_headers, item, locator):
        resp = client.post("/api/v1/inventory", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "quantity": 50,
            "min_quantity": 5,
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["quantity"] == 50

    def test_create_inventory_invalid_locator(self, client, admin_headers, item):
        resp = client.post("/api/v1/inventory", json={
            "item_id": item.id,
            "locator_id": 9999,
            "quantity": 10,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_create_inventory_invalid_item(self, client, admin_headers, locator):
        resp = client.post("/api/v1/inventory", json={
            "item_id": 9999,
            "locator_id": locator.id,
            "quantity": 10,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_create_inventory_duplicate(self, client, admin_headers, inventory_record):
        resp = client.post("/api/v1/inventory", json={
            "item_id": inventory_record.item_id,
            "locator_id": inventory_record.locator_id,
            "sublocator_id": inventory_record.sublocator_id,
            "quantity": 10,
        }, headers=admin_headers)
        assert resp.status_code == 409
        assert "already has an inventory record" in resp.json()["detail"]

    def test_list_inventory(self, client, admin_headers, inventory_record):
        resp = client.get("/api/v1/inventory", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_inventory_filter_locator(self, client, admin_headers, inventory_record, locator):
        resp = client.get(f"/api/v1/inventory?locator_id={locator.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_inventory_low_stock(self, client, admin_headers, db, inventory_record):
        inventory_record.quantity = 5  # below min_quantity=10
        db.commit()
        resp = client.get("/api/v1/inventory?low_stock=true", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_inventory_search(self, client, admin_headers, inventory_record):
        resp = client.get("/api/v1/inventory?search=Test Item", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_inventory_search_no_match(self, client, admin_headers, inventory_record):
        resp = client.get("/api/v1/inventory?search=nonexistent", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_get_inventory(self, client, admin_headers, inventory_record):
        resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == inventory_record.id

    def test_update_inventory(self, client, admin_headers, inventory_record):
        resp = client.patch(f"/api/v1/inventory/{inventory_record.id}", json={
            "quantity": 200,
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 200

    def test_delete_inventory(self, client, admin_headers, inventory_record):
        resp = client.delete(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_adjust_inventory(self, client, admin_headers, inventory_record):
        resp = client.post(f"/api/v1/inventory/{inventory_record.id}/adjust", json={
            "adjustment": -10,
            "reason": "Physical count correction",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 90  # 100 - 10

    def test_adjust_inventory_negative_result(self, client, admin_headers, inventory_record):
        resp = client.post(f"/api/v1/inventory/{inventory_record.id}/adjust", json={
            "adjustment": -200,
            "reason": "Too much",
        }, headers=admin_headers)
        assert resp.status_code == 400

    def test_inventory_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/inventory/9999", headers=admin_headers)
        assert resp.status_code == 404


class TestInventorySorting:
    def test_sort_inventory_by_quantity_asc(self, client, admin_headers, item, locator, db):
        from app.models.checkout import Inventory
        for qty in [50, 10, 30]:
            db.add(Inventory(item_id=item.id, locator_id=locator.id, quantity=qty, min_quantity=5))
        db.commit()
        resp = client.get("/api/v1/inventory?sort_by=quantity&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        quantities = [r["quantity"] for r in resp.json()["items"]]
        assert quantities == sorted(quantities)

    def test_sort_inventory_by_quantity_desc(self, client, admin_headers, item, locator, db):
        from app.models.checkout import Inventory
        for qty in [50, 10, 30]:
            db.add(Inventory(item_id=item.id, locator_id=locator.id, quantity=qty, min_quantity=5))
        db.commit()
        resp = client.get("/api/v1/inventory?sort_by=quantity&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        quantities = [r["quantity"] for r in resp.json()["items"]]
        assert quantities == sorted(quantities, reverse=True)
