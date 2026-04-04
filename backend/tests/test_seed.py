from app.models.item import Category, Item
from app.utils.seed import (
    PHYSICS_CATALOG,
    LEGACY_CATEGORIES,
    seed_physics_catalog,
    cleanup_legacy_categories,
    run_seed,
)


class TestPhysicsCatalogSeed:
    def test_creates_all_categories(self, db):
        seed_physics_catalog(db)
        categories = db.query(Category).all()
        cat_names = {c.name for c in categories}
        for expected_name in PHYSICS_CATALOG:
            assert expected_name in cat_names

    def test_creates_items_with_correct_categories(self, db):
        seed_physics_catalog(db)
        for cat_name, (_, items_list) in PHYSICS_CATALOG.items():
            category = db.query(Category).filter(Category.name == cat_name).first()
            assert category is not None
            for item_name, unit in items_list:
                item = db.query(Item).filter(Item.name == item_name).first()
                assert item is not None, f"Item '{item_name}' not found"
                assert item.category_id == category.id
                assert item.unit_of_measure == unit

    def test_creates_expected_item_count(self, db):
        seed_physics_catalog(db)
        expected_count = sum(len(items) for _, (_, items) in PHYSICS_CATALOG.items())
        actual_count = db.query(Item).count()
        assert actual_count == expected_count

    def test_categories_have_descriptions(self, db):
        seed_physics_catalog(db)
        for cat_name, (cat_desc, _) in PHYSICS_CATALOG.items():
            category = db.query(Category).filter(Category.name == cat_name).first()
            assert category.description == cat_desc

    def test_idempotent_no_duplicates(self, db):
        seed_physics_catalog(db)
        count_after_first = db.query(Item).count()
        cat_count_after_first = db.query(Category).count()

        seed_physics_catalog(db)
        count_after_second = db.query(Item).count()
        cat_count_after_second = db.query(Category).count()

        assert count_after_first == count_after_second
        assert cat_count_after_first == cat_count_after_second


class TestLegacyCategoryCleanup:
    def test_removes_empty_legacy_categories(self, db):
        for name in LEGACY_CATEGORIES:
            db.add(Category(name=name))
        db.commit()
        assert db.query(Category).count() == len(LEGACY_CATEGORIES)

        cleanup_legacy_categories(db)
        assert db.query(Category).count() == 0

    def test_keeps_legacy_categories_with_items(self, db):
        cat = Category(name="Art Supplies")
        db.add(cat)
        db.flush()
        db.add(Item(name="Paint", category_id=cat.id, unit_of_measure="unit"))
        db.commit()

        cleanup_legacy_categories(db)
        remaining = db.query(Category).filter(Category.name == "Art Supplies").first()
        assert remaining is not None

    def test_ignores_nonexistent_legacy_categories(self, db):
        # Should not raise even when none of the legacy categories exist
        cleanup_legacy_categories(db)


class TestRunSeed:
    def test_run_seed_creates_admin_and_catalog(self, db):
        run_seed(db)
        from app.models.user import User
        admin = db.query(User).filter(User.username == "admin").first()
        assert admin is not None
        assert admin.role == "admin"

        cat_count = db.query(Category).count()
        assert cat_count == len(PHYSICS_CATALOG)

        item_count = db.query(Item).count()
        assert item_count > 0
