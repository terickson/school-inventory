from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User
from app.models.item import Category, Item

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Legacy categories that should be cleaned up if they have no items
LEGACY_CATEGORIES = [
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

# Physics lab catalog: category -> (description, [(item_name, unit_of_measure), ...])
PHYSICS_CATALOG: dict[str, tuple[str, list[tuple[str, str]]]] = {
    "Mechanics": (
        "Springs, masses, pulleys, carts, and force measurement equipment",
        [
            ("Spring Set (assorted)", "set"),
            ("Hooked Mass Set (brass)", "set"),
            ("Slotted Mass Set", "set"),
            ("Pulley (single, clamp-mount)", "unit"),
            ("Pulley (double/triple)", "unit"),
            ("Dynamics Cart", "unit"),
            ("Dynamics Track (1.2m)", "unit"),
            ("Force Sensor (digital)", "unit"),
            ("Friction Block", "unit"),
            ("Inclined Plane", "unit"),
            ("Pendulum Bob Set", "set"),
            ("Air Track Glider", "unit"),
            ("Collision Carts (pair)", "pair"),
            ("Spring Scale (Newton)", "unit"),
            ("Ball Launcher / Projectile Launcher", "unit"),
            ("Metal Ramp", "unit"),
            ("Pulley Cord / String (spool)", "spool"),
        ],
    ),
    "Optics": (
        "Lenses, mirrors, laser pointers, and optical bench equipment",
        [
            ("Convex Lens", "unit"),
            ("Concave Lens", "unit"),
            ("Plane Mirror", "unit"),
            ("Concave Mirror", "unit"),
            ("Convex Mirror", "unit"),
            ("Laser Pointer (red)", "unit"),
            ("Optical Bench", "unit"),
            ("Prism (glass, triangular)", "unit"),
            ("Ray Box / Light Source", "unit"),
            ("Lens Holder", "unit"),
            ("Color Filter Set", "set"),
            ("Diffraction Grating", "unit"),
            ("Fiber Optic Demo Kit", "kit"),
        ],
    ),
    "Electricity & Magnetism": (
        "Batteries, resistors, capacitors, multimeters, magnets, and wiring",
        [
            ("Battery Holder (D-cell)", "unit"),
            ("Resistor Assortment Pack", "pack"),
            ("Capacitor Assortment Pack", "pack"),
            ("Digital Multimeter", "unit"),
            ("Bar Magnet (pair)", "pair"),
            ("Horseshoe Magnet", "unit"),
            ("Wire Spool (insulated copper)", "spool"),
            ("Circuit Board / Breadboard", "unit"),
            ("Switch (knife/toggle)", "unit"),
            ("Light Bulb (miniature, screw base)", "pack"),
            ("Light Bulb Holder", "unit"),
            ("Ammeter (analog)", "unit"),
            ("Voltmeter (analog)", "unit"),
            ("Alligator Clip Leads (set)", "set"),
            ("Electromagnet Kit", "kit"),
            ("Van de Graaff Generator", "unit"),
            ("Compass (magnetic)", "unit"),
            ("Hand-Crank Generator", "unit"),
        ],
    ),
    "Waves & Sound": (
        "Tuning forks, wave generators, slinkies, and acoustic equipment",
        [
            ("Tuning Fork Set", "set"),
            ("Slinky Spring (metal)", "unit"),
            ("Slinky Spring (plastic)", "unit"),
            ("Wave Generator / Oscillator", "unit"),
            ("Ripple Tank", "unit"),
            ("Resonance Tube", "unit"),
            ("Speaker (small, for demos)", "unit"),
            ("Tuning Fork Mallet", "unit"),
            ("Standing Wave String Apparatus", "unit"),
            ("Sound Level Meter", "unit"),
        ],
    ),
    "Thermodynamics": (
        "Thermometers, calorimeters, heat lamps, and thermal equipment",
        [
            ("Thermometer (digital)", "unit"),
            ("Thermometer (glass, alcohol)", "unit"),
            ("Calorimeter (nested cup)", "unit"),
            ("Heat Lamp (with clamp)", "unit"),
            ("Insulation Sample Set", "set"),
            ("Thermal Expansion Apparatus", "unit"),
            ("Infrared Thermometer (non-contact)", "unit"),
            ("Specific Heat Metal Samples Set", "set"),
            ("Stirring Rod (glass)", "unit"),
            ("Hot Plate (single burner)", "unit"),
        ],
    ),
    "Measurement & Tools": (
        "Rulers, protractors, stopwatches, scales, and measuring instruments",
        [
            ("Ruler (30cm)", "unit"),
            ("Meter Stick", "unit"),
            ("Protractor", "unit"),
            ("Stopwatch (digital)", "unit"),
            ("Digital Scale (0.1g precision)", "unit"),
            ("Vernier Caliper", "unit"),
            ("Tape Measure (3m)", "unit"),
            ("Bubble Level", "unit"),
            ("Triple Beam Balance", "unit"),
            ("Motion Sensor (digital)", "unit"),
            ("Photogate Timer", "unit"),
        ],
    ),
    "General Lab Equipment": (
        "Safety gear, lab supplies, clamps, stands, and general consumables",
        [
            ("Safety Goggles", "unit"),
            ("Lab Notebook", "unit"),
            ("Dry Erase Marker (set)", "set"),
            ("Masking Tape (roll)", "roll"),
            ("Duct Tape (roll)", "roll"),
            ("C-Clamp (small)", "unit"),
            ("Ring Stand", "unit"),
            ("Ring Stand Clamp", "unit"),
            ("String / Twine (spool)", "spool"),
            ("Scissors", "unit"),
            ("Zip Ties (bag)", "bag"),
            ("Battery (AA, pack of 4)", "pack"),
            ("Battery (D-cell, pack of 2)", "pack"),
            ("Graph Paper Pad", "pad"),
            ("Whiteboard (small, portable)", "unit"),
        ],
    ),
}


def seed_admin(db: Session) -> None:
    """Create admin user if not exists. Idempotent."""
    existing = db.query(User).filter(User.username == settings.admin_username).first()
    if existing:
        return
    admin = User(
        username=settings.admin_username,
        full_name="System Administrator",
        password_hash=pwd_context.hash(settings.admin_password),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()


def cleanup_legacy_categories(db: Session) -> None:
    """Remove old generic categories that have no items attached."""
    for name in LEGACY_CATEGORIES:
        cat = db.query(Category).filter(Category.name == name).first()
        if cat and len(cat.items) == 0:
            db.delete(cat)
    db.commit()


def seed_physics_catalog(db: Session) -> None:
    """Create physics categories and items if they don't exist. Idempotent."""
    for cat_name, (cat_desc, items) in PHYSICS_CATALOG.items():
        category = db.query(Category).filter(Category.name == cat_name).first()
        if not category:
            category = Category(name=cat_name, description=cat_desc)
            db.add(category)
            db.flush()

        for item_name, unit in items:
            existing_item = db.query(Item).filter(Item.name == item_name).first()
            if not existing_item:
                db.add(Item(
                    name=item_name,
                    category_id=category.id,
                    unit_of_measure=unit,
                ))
    db.commit()


def run_seed(db: Session) -> None:
    """Run all seed operations."""
    seed_admin(db)
    cleanup_legacy_categories(db)
    seed_physics_catalog(db)


if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_seed(db)
        print("Seed complete.")
    finally:
        db.close()
