from datetime import datetime, timezone
from app.models.checkout import Checkout


class TestCheckoutEndpoints:
    def test_create_checkout(self, client, admin_headers, admin_user, inventory_record):
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 5,
            "notes": "For art project",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["quantity"] == 5
        assert resp.json()["status"] == "active"

    def test_create_checkout_insufficient_stock(self, client, admin_headers, inventory_record):
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 999,
        }, headers=admin_headers)
        assert resp.status_code == 400
        assert "Insufficient stock" in resp.json()["detail"]

    def test_create_checkout_decrements_inventory(self, client, admin_headers, inventory_record):
        client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 10,
        }, headers=admin_headers)
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 90  # 100 - 10

    def test_admin_checkout_on_behalf(self, client, admin_headers, teacher_user, inventory_record):
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 3,
            "user_id": teacher_user.id,
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["user_id"] == teacher_user.id

    def test_teacher_cannot_checkout_for_others(self, client, teacher_headers, admin_user, inventory_record):
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 1,
            "user_id": admin_user.id,
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_list_checkouts(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            status="active",
        )
        db.add(co)
        db.commit()
        resp = client.get("/api/v1/checkouts", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_checkout(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            status="active",
        )
        db.add(co)
        db.commit()
        db.refresh(co)
        resp = client.get(f"/api/v1/checkouts/{co.id}", headers=admin_headers)
        assert resp.status_code == 200

    def test_return_checkout(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=5,
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5  # simulate checkout decrement
        db.commit()
        db.refresh(co)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "returned"
        assert resp.json()["returned_quantity"] == 5
        assert resp.json()["return_date"] is not None
        # Check inventory restored
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 100  # restored

    def test_partial_return(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=5,
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5
        db.commit()
        db.refresh(co)
        # Return 2 of 5
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 2}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"
        assert resp.json()["returned_quantity"] == 2
        assert resp.json()["return_date"] is None
        # Check inventory partially restored
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 97  # 95 + 2

    def test_partial_return_then_full_return(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=5,
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5
        db.commit()
        db.refresh(co)
        # Return 2 of 5
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 2}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"
        # Return remaining 3
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 3}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "returned"
        assert resp.json()["returned_quantity"] == 5
        assert resp.json()["return_date"] is not None
        # Inventory fully restored
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 100

    def test_partial_return_cannot_exceed_remaining(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=5,
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5
        db.commit()
        db.refresh(co)
        # Return 3
        client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 3}, headers=admin_headers)
        # Try to return 4 (only 2 remaining)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 4}, headers=admin_headers)
        assert resp.status_code == 400
        assert "remaining" in resp.json()["detail"].lower()

    def test_return_default_quantity_is_remaining(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=5,
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5
        db.commit()
        db.refresh(co)
        # Return 2 explicitly
        client.post(f"/api/v1/checkouts/{co.id}/return", json={"quantity": 2}, headers=admin_headers)
        # Return with no quantity (should return remaining 3)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "returned"
        assert resp.json()["returned_quantity"] == 5

    def test_return_already_returned(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            status="returned",
            return_date=datetime.now(timezone.utc),
        )
        db.add(co)
        db.commit()
        db.refresh(co)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={}, headers=admin_headers)
        assert resp.status_code == 400

    def test_checkout_summary(self, client, admin_headers):
        resp = client.get("/api/v1/checkouts/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_items" in data
        assert "active_checkouts" in data
        assert "low_stock_count" in data

    def test_checkout_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/checkouts/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_inventory_with_active_checkout_blocked(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            status="active",
        )
        db.add(co)
        db.commit()
        resp = client.delete(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert resp.status_code == 400


class TestCheckoutSorting:
    def test_sort_checkouts_default_order_without_sort(self, client, admin_headers, admin_user, inventory_record, db):
        """Without sort params, checkouts default to created_at desc."""
        for _ in range(3):
            co = Checkout(
                inventory_id=inventory_record.id,
                user_id=admin_user.id,
                quantity=1,
                status="active",
            )
            db.add(co)
            db.commit()
        resp = client.get("/api/v1/checkouts", headers=admin_headers)
        assert resp.status_code == 200
        dates = [c["created_at"] for c in resp.json()["items"]]
        assert dates == sorted(dates, reverse=True)


class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
