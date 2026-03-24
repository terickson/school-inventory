class TestCategoryEndpoints:
    def test_list_categories(self, client, admin_headers, category):
        resp = client.get("/api/v1/categories", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_create_category(self, client, admin_headers):
        resp = client.post("/api/v1/categories", json={
            "name": "New Category",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "New Category"

    def test_create_category_teacher_forbidden(self, client, teacher_headers):
        resp = client.post("/api/v1/categories", json={
            "name": "Forbidden",
        }, headers=teacher_headers)
        assert resp.status_code == 403


class TestItemEndpoints:
    def test_create_item(self, client, admin_headers, category):
        resp = client.post("/api/v1/items", json={
            "name": "Pencils",
            "description": "No. 2 pencils",
            "category_id": category.id,
            "unit_of_measure": "box",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Pencils"

    def test_create_item_invalid_category(self, client, admin_headers):
        resp = client.post("/api/v1/items", json={
            "name": "Pencils",
            "category_id": 9999,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_list_items(self, client, admin_headers, item):
        resp = client.get("/api/v1/items", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_items_search(self, client, admin_headers, item):
        resp = client.get("/api/v1/items?search=Test", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_items_filter_category(self, client, admin_headers, item, category):
        resp = client.get(f"/api/v1/items?category_id={category.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_item(self, client, admin_headers, item):
        resp = client.get(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == item.id

    def test_get_item_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/items/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_item(self, client, admin_headers, item):
        resp = client.patch(f"/api/v1/items/{item.id}", json={
            "name": "Updated Item",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Item"

    def test_delete_item(self, client, admin_headers, item):
        resp = client.delete(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_item_with_inventory_blocked(self, client, admin_headers, inventory_record, item):
        resp = client.delete(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 400

    def test_create_item_teacher_forbidden(self, client, teacher_headers, category):
        resp = client.post("/api/v1/items", json={
            "name": "Bad", "category_id": category.id,
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_teacher_can_list_items(self, client, teacher_headers, item):
        resp = client.get("/api/v1/items", headers=teacher_headers)
        assert resp.status_code == 200


class TestItemSorting:
    def test_sort_items_by_name_asc(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Scissors", "Glue Sticks", "Markers"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names)

    def test_sort_items_by_name_desc(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Scissors", "Glue Sticks", "Markers"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?sort_by=name&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names, reverse=True)

    def test_sort_items_with_search(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Red Paint", "Red Markers", "Red Paper"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?search=Red&sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names)
        assert all("Red" in n for n in names)
