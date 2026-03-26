import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.dependencies.auth import create_access_token
from app.models import User, Category, Item, Locator, Sublocator, Inventory, Checkout
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client(db):
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def admin_user(db):
    user = User(
        username="admin",
        full_name="Admin User",
        password_hash=pwd_context.hash("admin123"),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def teacher_user(db):
    user = User(
        username="teacher1",
        full_name="Teacher One",
        password_hash=pwd_context.hash("teacher123"),
        role="teacher",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(admin_user.id)


@pytest.fixture
def teacher_token(teacher_user):
    return create_access_token(teacher_user.id)


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def teacher_headers(teacher_token):
    return {"Authorization": f"Bearer {teacher_token}"}


@pytest.fixture
def category(db):
    cat = Category(name="Test Category")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture
def item(db, category):
    it = Item(name="Test Item", category_id=category.id, unit_of_measure="unit")
    db.add(it)
    db.commit()
    db.refresh(it)
    return it


@pytest.fixture
def locator(db, admin_user):
    loc = Locator(name="Closet A", user_id=admin_user.id)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@pytest.fixture
def sublocator(db, locator):
    sub = Sublocator(name="Shelf 1", locator_id=locator.id)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@pytest.fixture
def inventory_record(db, item, locator, sublocator):
    inv = Inventory(
        item_id=item.id,
        locator_id=locator.id,
        sublocator_id=sublocator.id,
        quantity=100,
        min_quantity=10,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv
