from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User
from app.models.item import Category

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

DEFAULT_CATEGORIES = [
    "Art Supplies",
    "Writing Instruments",
    "Paper Products",
    "Binding & Fastening",
    "Cutting Tools",
    "Measuring Tools",
    "Classroom Tech",
    "Cleaning Supplies",
    "Storage",
    "Miscellaneous",
]


def seed_admin(db: Session) -> None:
    """Create admin user if not exists. Idempotent."""
    existing = db.query(User).filter(User.username == settings.admin_username).first()
    if existing:
        return
    admin = User(
        username=settings.admin_username,
        email=settings.admin_email,
        full_name="System Administrator",
        password_hash=pwd_context.hash(settings.admin_password),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()


def seed_categories(db: Session) -> None:
    """Create default categories if they don't exist. Idempotent."""
    for name in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == name).first()
        if not existing:
            db.add(Category(name=name))
    db.commit()


def run_seed(db: Session) -> None:
    """Run all seed operations."""
    seed_admin(db)
    seed_categories(db)


if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_seed(db)
        print("Seed complete.")
    finally:
        db.close()
