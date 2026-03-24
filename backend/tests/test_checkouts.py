from datetime import datetime, timezone, timedelta
from app.models.checkout import Checkout


class TestCheckoutEndpoints:
    def test_create_checkout(self, client, admin_headers, admin_user, inventory_record):
        due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 5,
            "due_date": due,
            "notes": "For art project",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["quantity"] == 5
        assert resp.json()["status"] == "active"

    def test_create_checkout_insufficient_stock(self, client, admin_headers, inventory_record):
        due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 999,
            "due_date": due,
        }, headers=admin_headers)
        assert resp.status_code == 400
        assert "Insufficient stock" in resp.json()["detail"]

    def test_create_checkout_decrements_inventory(self, client, admin_headers, inventory_record):
        due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 10,
            "due_date": due,
        }, headers=admin_headers)
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 90  # 100 - 10

    def test_create_checkout_default_due_date(self, client, admin_headers, inventory_record):
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["due_date"] is not None

    def test_admin_checkout_on_behalf(self, client, admin_headers, teacher_user, inventory_record):
        due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 3,
            "due_date": due,
            "user_id": teacher_user.id,
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["user_id"] == teacher_user.id

    def test_teacher_cannot_checkout_for_others(self, client, teacher_headers, admin_user, inventory_record):
        due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        resp = client.post("/api/v1/checkouts", json={
            "inventory_id": inventory_record.id,
            "quantity": 1,
            "due_date": due,
            "user_id": admin_user.id,
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_list_checkouts(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
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
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
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
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
            status="active",
        )
        db.add(co)
        inventory_record.quantity -= 5  # simulate checkout decrement
        db.commit()
        db.refresh(co)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "returned"
        assert resp.json()["return_date"] is not None
        # Check inventory restored
        inv_resp = client.get(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert inv_resp.json()["quantity"] == 100  # restored

    def test_return_already_returned(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
            status="returned",
            return_date=datetime.now(timezone.utc),
        )
        db.add(co)
        db.commit()
        db.refresh(co)
        resp = client.post(f"/api/v1/checkouts/{co.id}/return", json={}, headers=admin_headers)
        assert resp.status_code == 400

    def test_extend_checkout(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            due_date=datetime.now(timezone.utc) + timedelta(days=1),
            status="active",
        )
        db.add(co)
        db.commit()
        db.refresh(co)
        new_due = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        resp = client.post(f"/api/v1/checkouts/{co.id}/extend", json={
            "due_date": new_due,
        }, headers=admin_headers)
        assert resp.status_code == 200

    def test_overdue_checkouts(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            due_date=datetime.now(timezone.utc) - timedelta(days=1),
            status="active",
        )
        db.add(co)
        db.commit()
        resp = client.get("/api/v1/checkouts/overdue", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_checkout_summary(self, client, admin_headers):
        resp = client.get("/api/v1/checkouts/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_items" in data
        assert "active_checkouts" in data
        assert "overdue_count" in data
        assert "low_stock_count" in data

    def test_checkout_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/checkouts/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_inventory_with_active_checkout_blocked(self, client, admin_headers, admin_user, inventory_record, db):
        co = Checkout(
            inventory_id=inventory_record.id,
            user_id=admin_user.id,
            quantity=2,
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
            status="active",
        )
        db.add(co)
        db.commit()
        resp = client.delete(f"/api/v1/inventory/{inventory_record.id}", headers=admin_headers)
        assert resp.status_code == 400


class TestCheckoutSorting:
    def test_sort_checkouts_by_due_date_asc(self, client, admin_headers, admin_user, inventory_record, db):
        for days in [7, 1, 14]:
            co = Checkout(
                inventory_id=inventory_record.id,
                user_id=admin_user.id,
                quantity=1,
                due_date=datetime.now(timezone.utc) + timedelta(days=days),
                status="active",
            )
            db.add(co)
        db.commit()
        resp = client.get("/api/v1/checkouts?sort_by=due_date&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        dates = [c["due_date"] for c in resp.json()["items"]]
        assert dates == sorted(dates)

    def test_sort_checkouts_by_due_date_desc(self, client, admin_headers, admin_user, inventory_record, db):
        for days in [7, 1, 14]:
            co = Checkout(
                inventory_id=inventory_record.id,
                user_id=admin_user.id,
                quantity=1,
                due_date=datetime.now(timezone.utc) + timedelta(days=days),
                status="active",
            )
            db.add(co)
        db.commit()
        resp = client.get("/api/v1/checkouts?sort_by=due_date&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        dates = [c["due_date"] for c in resp.json()["items"]]
        assert dates == sorted(dates, reverse=True)

    def test_sort_checkouts_default_order_without_sort(self, client, admin_headers, admin_user, inventory_record, db):
        """Without sort params, checkouts default to created_at desc."""
        for days in [7, 1, 14]:
            co = Checkout(
                inventory_id=inventory_record.id,
                user_id=admin_user.id,
                quantity=1,
                due_date=datetime.now(timezone.utc) + timedelta(days=days),
                status="active",
            )
            db.add(co)
            db.commit()
        resp = client.get("/api/v1/checkouts", headers=admin_headers)
        assert resp.status_code == 200
        dates = [c["created_at"] for c in resp.json()["items"]]
        assert dates == sorted(dates, reverse=True)

    def test_sort_overdue_by_due_date(self, client, admin_headers, admin_user, inventory_record, db):
        for days in [1, 3, 2]:
            co = Checkout(
                inventory_id=inventory_record.id,
                user_id=admin_user.id,
                quantity=1,
                due_date=datetime.now(timezone.utc) - timedelta(days=days),
                status="active",
            )
            db.add(co)
        db.commit()
        resp = client.get("/api/v1/checkouts/overdue?sort_by=due_date&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        dates = [c["due_date"] for c in resp.json()["items"]]
        assert dates == sorted(dates)


class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
