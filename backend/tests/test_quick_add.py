import pytest
from app.models.item import Item
from app.models.checkout import Inventory


class TestQuickAdd:
    def test_quick_add_existing_item(self, client, admin_headers, item, locator, sublocator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "sublocator_id": sublocator.id,
            "quantity": 5,
        }, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["item_created"] is False
        assert data["inventory"]["quantity"] == 5
        assert data["item"]["id"] == item.id

    def test_quick_add_new_item_by_name(self, client, admin_headers, category, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_name": "Brand New Widget",
            "category_id": category.id,
            "unit_of_measure": "pack",
            "locator_id": locator.id,
            "quantity": 10,
        }, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["item_created"] is True
        assert data["item"]["name"] == "Brand New Widget"
        assert data["inventory"]["quantity"] == 10

    def test_quick_add_existing_item_by_name(self, client, admin_headers, item, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_name": item.name,
            "locator_id": locator.id,
            "quantity": 3,
        }, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["item_created"] is False
        assert data["item"]["id"] == item.id

    def test_quick_add_upsert_adds_quantity(self, client, admin_headers, item, locator, sublocator):
        # First add
        resp1 = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "sublocator_id": sublocator.id,
            "quantity": 5,
        }, headers=admin_headers)
        assert resp1.status_code == 201
        assert resp1.json()["inventory"]["quantity"] == 5

        # Second add — should add to existing
        resp2 = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "sublocator_id": sublocator.id,
            "quantity": 3,
        }, headers=admin_headers)
        assert resp2.status_code == 201
        assert resp2.json()["inventory"]["quantity"] == 8

    def test_quick_add_no_item_id_or_name_returns_422(self, client, admin_headers, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "locator_id": locator.id,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 422

    def test_quick_add_new_item_without_category_returns_422(self, client, admin_headers, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_name": "No Category Item",
            "locator_id": locator.id,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 422

    def test_quick_add_nonexistent_locator_returns_404(self, client, admin_headers, item):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": 99999,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_quick_add_nonexistent_item_id_returns_404(self, client, admin_headers, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": 99999,
            "locator_id": locator.id,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_quick_add_nonexistent_category_returns_404(self, client, admin_headers, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_name": "Orphan Item",
            "category_id": 99999,
            "locator_id": locator.id,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_quick_add_requires_auth(self, client, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "locator_id": locator.id,
            "quantity": 1,
        })
        assert resp.status_code == 401

    def test_quick_add_as_teacher(self, client, teacher_headers, item, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "quantity": 2,
        }, headers=teacher_headers)
        assert resp.status_code == 201

    def test_quick_add_without_sublocator(self, client, admin_headers, item, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "quantity": 7,
        }, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["inventory"]["sublocator_id"] is None
        assert data["inventory"]["quantity"] == 7

    def test_quick_add_nonexistent_sublocator_returns_404(self, client, admin_headers, item, locator):
        resp = client.post("/api/v1/inventory/quick-add", json={
            "item_id": item.id,
            "locator_id": locator.id,
            "sublocator_id": 99999,
            "quantity": 1,
        }, headers=admin_headers)
        assert resp.status_code == 404
