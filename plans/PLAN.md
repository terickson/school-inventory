# School Supply Inventory Management System — Master Plan

---

## 1. Executive Summary

A web-based inventory management system that allows teachers to track school supplies stored in physical storage closets (locators) and shelves (sublocators). The system provides quantity-based tracking (no asset tags), a checkout/return system with due dates, role-based access control (admin and teacher), and a responsive UI for laptop and phone. The backend is a Python FastAPI REST API with SQLite, and the frontend is a Vue 3 + Vuetify 3 single-page application.

### Key Differentiators vs. Existing Tools
- **Quantity-based, not asset-tag-based** — simpler for consumable school supplies
- **Two-level location hierarchy** (closet + shelf) as a first-class citizen
- **Optimized for teachers on phones** — mobile-first checkout flow
- **Self-hosted and free** — no per-seat licensing
- **Checkout designed for short-duration borrowing** — not equipment loans

### Competitive Landscape

| Product | Strengths | Weaknesses for Schools |
|---|---|---|
| Cheqroom | Checkout workflows, overdue alerts | Asset-tag oriented; overkill for consumables |
| Snipe-IT (open source) | Asset tracking, REST API | Built for tagged assets, not quantities |
| Asset Panda | Custom fields, barcode scan | Expensive; quantity tracking is secondary |
| Sortly | Quantity tracking, location fields | No checkout system; no school roles |
| Destiny Resource Manager | Library checkout, due dates | Expensive; library-focused |
| Google Sheets + Forms | Free, familiar | No automation, no access control |

---

## 2. User Profiles & Stories

### 2.1 Admin (Supply Room Manager / Department Head)

**Context:** Designated staff member responsible for maintaining inventory, managing locations, overseeing checkouts. Works primarily from a laptop. Full authority over catalog and user accounts.

**Core needs:** Full CRUD over items/locations/users, visibility into all checkouts and overdue loans, low-stock alerts, ability to process checkouts on behalf of teachers.

### 2.2 Teacher (Borrower)

**Context:** Classroom instructor who borrows supplies from shared storage. Often on a phone, standing in a hallway or storage room. Should complete a checkout in under 60 seconds.

**Core needs:** Browse/search items quickly, self-service checkout and return, view active loans, receive reminders about due items.

---

### 2.3 Admin User Stories

#### Account & User Management
- As an Admin, I can create teacher accounts with name, email, and role so that teachers can log in and manage their own checkouts.
- As an Admin, I can deactivate a teacher account without deleting their checkout history so that records are preserved when staff leave.
- As an Admin, I can reset a teacher's password so that I can assist users who are locked out.
- As an Admin, I can view a full list of all users and their current role so that I can audit access permissions.

#### Locator (Storage Closet) Management
- As an Admin, I can create a Locator with a name and optional description so that physical storage spaces are represented in the system.
- As an Admin, I can edit or archive a Locator so that retired or renamed closets no longer appear in active workflows.
- As an Admin, I can view all items stored within a specific Locator so that I can audit its contents.

#### Sublocator (Shelf) Management
- As an Admin, I can create Sublocators (shelves) within a Locator so that items can be organized at a finer granularity.
- As an Admin, I can rename or reorder Sublocators within a Locator so that the system matches how the physical space is organized.
- As an Admin, I can delete an empty Sublocator so that the catalog stays clean.

#### Item Catalog Management
- As an Admin, I can add an item to the catalog with a name, description, quantity on hand, unit of measure, and location so that the item is trackable.
- As an Admin, I can edit any item's details so that corrections and updates are possible.
- As an Admin, I can set a minimum quantity threshold for an item so that I receive a low-stock alert when supplies run low.
- As an Admin, I can mark an item as "inactive" rather than deleting it so that historical checkout records remain valid.
- As an Admin, I can perform a manual quantity adjustment with a reason note so that physical counts and system counts can be reconciled.
- As an Admin, I can view the full adjustment and checkout history for an item so that I can trace discrepancies.

#### Checkout Management (Admin)
- As an Admin, I can check out an item on behalf of a teacher (including a substitute) so that non-self-service situations are handled.
- As an Admin, I can view all currently active checkouts across all users so that I have full visibility.
- As an Admin, I can view all overdue checkouts with borrower contact information so that I can follow up.
- As an Admin, I can forcibly mark an item as returned (with a note) so that inventory is corrected when a return is not self-reported.
- As an Admin, I can extend the due date on an active checkout so that legitimate extensions are tracked.
- As an Admin, I can configure a default loan duration (e.g., 7 days).

#### Reporting & Alerts
- As an Admin, I can view a low-stock alert when an item falls below its minimum threshold so that restocking is timely.
- As an Admin, I can view a report of all checkouts within a date range, filterable by user or item.
- As an Admin, I can see a dashboard summary (total items, active checkouts, overdue items, low-stock items).

### 2.4 Teacher User Stories

#### Browsing & Searching
- As a Teacher, I can search for an item by name so that I can quickly find what I need.
- As a Teacher, I can filter items by Locator or Sublocator so that I can see only what is in my assigned closet.
- As a Teacher, I can see the current available quantity for each item.
- As a Teacher, I can see where an item is physically located (Locator + Sublocator).

#### Checkout
- As a Teacher, I can check out an item by specifying a quantity and a due date so that my borrowing is logged.
- As a Teacher, I cannot check out more than the available quantity so that stock integrity is maintained.
- As a Teacher, I can add an optional note to a checkout (e.g., "for Room 204 art project").
- As a Teacher, I can check out multiple items in a single session.

#### Returns & Active Loans
- As a Teacher, I can view all my currently active checkouts in one place.
- As a Teacher, I can mark an item as returned (full or partial quantity).
- As a Teacher, I can see the due date on each of my active checkouts.

#### My Profile
- As a Teacher, I can update my own password.
- As a Teacher, I can view my own full checkout history.

### 2.5 Edge Case & System Stories
- When an item's available quantity drops to or below its minimum threshold, a low-stock alert is surfaced to Admins.
- When a checkout's due date passes without a return, the checkout is marked "overdue."
- If two teachers attempt to check out the last units simultaneously, only one succeeds; the other gets a clear "insufficient stock" message.
- When a teacher account is deactivated, all their active checkouts remain visible to Admins and are flagged for resolution.
- An Admin cannot delete a Locator or Sublocator that still contains items — the system prompts to reassign or remove items first.

---

## 3. Feature Plan

### Core Features (v1 — Must Have)

| Feature | Rationale |
|---|---|
| Two-level location hierarchy (Locator + Sublocator) | Matches real physical organization |
| Item catalog with quantity tracking | Fundamental; no per-item asset tags needed |
| Minimum stock threshold + low-stock flag | Prevents surprise stockouts |
| Manual quantity adjustment with audit note | Physical count reconciliation |
| Role-based access: Admin, Teacher | Prevents unauthorized changes |
| Teacher self-service checkout + return | Reduces admin burden |
| Checkout due date + overdue flag | Core accountability mechanism |
| Active checkout list per teacher | Teacher-facing accountability |
| Admin dashboard (summary counts) | Quick health check |
| Responsive UI (mobile + laptop) | Teachers on phones at point of need |

### Nice-to-Have (v2+)
- Item photo attachments, QR code labels, reservation scheduling, checkout notes/project tagging, usage analytics, reorder suggestions, item categories/tags, partial returns, CSV export/import

### Features to Avoid (Over-Engineering)
- Barcode/RFID scanning, procurement/PO workflows, SIS integration, asset depreciation, multi-step approval chains, real-time WebSocket sync, AI demand forecasting, native mobile apps, vendor catalog integration, deeper than 2-level hierarchy

---

## 4. Domain Terminology

| Domain Concept | Code/API Term | UI Term (verbose) | UI Term (compact) |
|---|---|---|---|
| Physical storage room/cabinet | `Locator` | Storage Location | Location |
| Shelf/section within a closet | `Sublocator` | Shelf | Shelf |
| A type of supply being tracked | `Item` | Item | Item |
| Current quantity of an item | `quantity_on_hand` | Quantity on Hand | On Hand |
| Minimum quantity before alert | `min_quantity` | Minimum Stock | Min Stock |
| An item taken out by a teacher | `Checkout` | Checkout | Checkout |
| Returning a checked-out item | `Return` / `return_checkout` | Return | Return |
| A past quantity correction | `AdjustmentLog` | Quantity Adjustment | Adjustment |
| Admin who manages the system | `Admin` | Administrator | Admin |
| Teacher who borrows items | `Teacher` | Teacher | Teacher |

---

## 5. Technology Stack

### Backend
| Concern | Library | Rationale |
|---|---|---|
| Framework | `fastapi` | Auto-generated OpenAPI/Swagger docs |
| ASGI Server | `uvicorn[standard]` | Production-grade, supports --reload |
| ORM | `SQLAlchemy 2.x` | Mature, typed select() in 2.x |
| Migrations | `alembic` | Standard SQLAlchemy migration tool |
| Validation | `pydantic v2` | Bundled with FastAPI |
| Auth | `python-jose[cryptography]` + `passlib[bcrypt]` | JWT + password hashing |
| Env config | `pydantic-settings` | Reads .env and env vars |
| Testing | `pytest` + `httpx` | httpx drives FastAPI's ASGI directly |
| CORS | FastAPI built-in `CORSMiddleware` | Zero deps |

### Frontend
| Concern | Library | Version |
|---|---|---|
| UI framework | Vue 3 (Composition API) | ^3.4 |
| Component library | Vuetify 3 | ^3.6 |
| Routing | Vue Router | ^4.3 |
| State management | Pinia | ^2.1 |
| HTTP client | Axios | ^1.7 |
| Build tooling | Vite | ^5.x |
| Unit tests | Vitest + Vue Test Utils | ^1.x / ^2.x |
| E2E tests | Puppeteer | ^22.x |
| Language | TypeScript | ^5.x |

### Infrastructure
- **Database:** SQLite with WAL mode
- **Deployment:** Docker Compose (backend + frontend containers)
- **Backend server:** uvicorn with --workers 1 (SQLite constraint)
- **Frontend server:** nginx serving static build

---

## 6. Database Design

### 6.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│    users     │       │  categories  │       │     items       │
│──────────────│       │──────────────│       │─────────────────│
│ id (PK)      │       │ id (PK)      │◄──────│ id (PK)         │
│ username     │       │ name         │       │ name            │
│ email        │       │ description  │       │ description     │
│ password_hash│       │ created_at   │       │ category_id(FK) │
│ full_name    │       │ updated_at   │       │ unit_of_measure │
│ role         │       └──────────────┘       │ created_at      │
│ is_active    │                              │ updated_at      │
│ created_at   │                              └────────┬────────┘
│ updated_at   │                                       │
└──────┬───────┘                                       │
       │ owns                                          │
       ▼                                               ▼
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│   locators   │       │ sublocators  │       │   inventory     │
│──────────────│       │──────────────│       │─────────────────│
│ id (PK)      │◄──────│ id (PK)      │◄──────│ id (PK)         │
│ name         │       │ name         │       │ item_id (FK)    │
│ description  │       │ description  │       │ locator_id (FK) │
│ user_id (FK) │       │ locator_id(FK│       │ sublocator_id   │
│ created_at   │       │ created_at   │       │   (FK, NULL)    │
│ updated_at   │       │ updated_at   │       │ quantity        │
└──────────────┘       └──────────────┘       │ min_quantity    │
                                              │ created_at      │
                                              │ updated_at      │
                                              └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   checkouts     │
                                              │─────────────────│
                                              │ id (PK)         │
                                              │ inventory_id(FK)│
                                              │ user_id (FK)    │
                                              │ quantity        │
                                              │ checkout_date   │
                                              │ due_date        │
                                              │ return_date     │
                                              │ status          │
                                              │ notes           │
                                              │ created_at      │
                                              │ updated_at      │
                                              └─────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                         audit_log                            │
│ id │ table_name │ record_id │ action │ changed_by (FK)       │
│ old_values (JSON) │ new_values (JSON) │ created_at           │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 PRAGMA Configuration (run on every connection)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;
```

### 6.3 DDL — Full Schema

#### `categories`
```sql
CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT,
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER trg_categories_updated_at
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `users`
```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    username      TEXT     NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT     NOT NULL UNIQUE COLLATE NOCASE,
    full_name     TEXT     NOT NULL DEFAULT '',
    password_hash TEXT     NOT NULL,
    role          TEXT     NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher')),
    is_active     INTEGER  NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at    TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);

CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `items`
```sql
CREATE TABLE IF NOT EXISTS items (
    id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    name            TEXT     NOT NULL UNIQUE COLLATE NOCASE,
    description     TEXT,
    category_id     INTEGER  NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    unit_of_measure TEXT     NOT NULL DEFAULT 'unit' CHECK (length(trim(unit_of_measure)) > 0),
    created_at      TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_items_category_id ON items (category_id);
CREATE INDEX IF NOT EXISTS idx_items_name        ON items (name);

CREATE TRIGGER trg_items_updated_at
AFTER UPDATE ON items
BEGIN
    UPDATE items SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `locators`
```sql
CREATE TABLE IF NOT EXISTS locators (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL COLLATE NOCASE,
    description TEXT,
    user_id     INTEGER  NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_locators_user_id ON locators (user_id);

CREATE TRIGGER trg_locators_updated_at
AFTER UPDATE ON locators
BEGIN
    UPDATE locators SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `sublocators`
```sql
CREATE TABLE IF NOT EXISTS sublocators (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    name        TEXT     NOT NULL COLLATE NOCASE,
    description TEXT,
    locator_id  INTEGER  NOT NULL REFERENCES locators (id) ON DELETE CASCADE,
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (locator_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sublocators_locator_id ON sublocators (locator_id);

CREATE TRIGGER trg_sublocators_updated_at
AFTER UPDATE ON sublocators
BEGIN
    UPDATE sublocators SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `inventory`
```sql
CREATE TABLE IF NOT EXISTS inventory (
    id             INTEGER  PRIMARY KEY AUTOINCREMENT,
    item_id        INTEGER  NOT NULL REFERENCES items (id) ON DELETE RESTRICT,
    locator_id     INTEGER  NOT NULL REFERENCES locators (id) ON DELETE RESTRICT,
    sublocator_id  INTEGER  REFERENCES sublocators (id) ON DELETE SET NULL,
    quantity       INTEGER  NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_quantity   INTEGER  NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
    created_at     TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at     TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (item_id, locator_id, sublocator_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_item_locator_no_shelf
    ON inventory (item_id, locator_id) WHERE sublocator_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_item_id       ON inventory (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locator_id    ON inventory (locator_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sublocator_id ON inventory (sublocator_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
    ON inventory (locator_id) WHERE quantity < min_quantity;

CREATE TRIGGER trg_inventory_updated_at
AFTER UPDATE ON inventory
BEGIN
    UPDATE inventory SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `checkouts`
```sql
CREATE TABLE IF NOT EXISTS checkouts (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    inventory_id  INTEGER  NOT NULL REFERENCES inventory (id) ON DELETE RESTRICT,
    user_id       INTEGER  NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    quantity      INTEGER  NOT NULL CHECK (quantity > 0),
    checkout_date TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    due_date      TEXT     NOT NULL,
    return_date   TEXT,
    status        TEXT     NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
    notes         TEXT,
    created_at    TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (return_date IS NULL OR return_date >= checkout_date),
    CHECK (NOT (status = 'returned' AND return_date IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_checkouts_inventory_id ON checkouts (inventory_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_user_id      ON checkouts (user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_status       ON checkouts (status);
CREATE INDEX IF NOT EXISTS idx_checkouts_due_date     ON checkouts (due_date) WHERE status = 'active';

CREATE TRIGGER trg_checkouts_updated_at
AFTER UPDATE ON checkouts
BEGIN
    UPDATE checkouts SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
```

#### `audit_log`
```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT     NOT NULL,
    record_id   INTEGER  NOT NULL,
    action      TEXT     NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by  INTEGER  REFERENCES users (id) ON DELETE SET NULL,
    old_values  TEXT,
    new_values  TEXT,
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by   ON audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON audit_log (created_at);
```

### 6.4 Constraints Summary

| Table | Constraint | Rule |
|---|---|---|
| users | CHECK | `role IN ('admin', 'teacher')` |
| users | CHECK | `is_active IN (0, 1)` |
| users | UNIQUE | `username`, `email` (case-insensitive) |
| categories | UNIQUE | `name` (case-insensitive) |
| items | UNIQUE | `name` (case-insensitive) |
| items | FK | `category_id → categories.id ON DELETE RESTRICT` |
| locators | UNIQUE | `(user_id, name)` |
| locators | FK | `user_id → users.id ON DELETE RESTRICT` |
| sublocators | UNIQUE | `(locator_id, name)` |
| sublocators | FK | `locator_id → locators.id ON DELETE CASCADE` |
| inventory | CHECK | `quantity >= 0`, `min_quantity >= 0` |
| inventory | UNIQUE | `(item_id, locator_id, sublocator_id)` + partial index for NULL |
| checkouts | CHECK | `quantity > 0`, `status IN (...)`, `return_date >= checkout_date` |

### 6.5 Seed Data

**10 Default Categories:**
Art Supplies, Writing Instruments, Paper Products, Binding & Fastening, Cutting Tools, Measuring Tools, Classroom Tech, Cleaning Supplies, Storage, Miscellaneous

**Admin User:** Created from environment variables (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) at startup. Password hashed with bcrypt.

### 6.6 Database Reset Script

```bash
#!/usr/bin/env bash
set -euo pipefail
DB_PATH="${1:-./school_inventory.db}"
rm -f "${DB_PATH}" "${DB_PATH}-wal" "${DB_PATH}-shm"
cd backend && alembic upgrade head && python -m app.utils.seed
echo "Database reset complete."
```

### 6.7 Key Query Patterns

- **Login:** `SELECT * FROM users WHERE username = :username AND is_active = 1`
- **Low stock:** `SELECT ... FROM inventory i JOIN items ... WHERE i.quantity < i.min_quantity`
- **Checkout (atomic):** `BEGIN; INSERT INTO checkouts ...; UPDATE inventory SET quantity = quantity - :qty; COMMIT;`
- **Return (atomic):** `BEGIN; UPDATE checkouts SET status='returned', return_date=now; UPDATE inventory SET quantity = quantity + :qty; COMMIT;`
- **Mark overdue:** `UPDATE checkouts SET status = 'overdue' WHERE status = 'active' AND due_date < now`

---

## 7. API Design

### 7.1 Backend Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, middleware, lifespan, router registration
│   ├── config.py            # pydantic-settings Settings class
│   ├── database.py          # engine, SessionLocal, Base, get_db, pragma listener
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── locator.py
│   │   ├── item.py
│   │   └── checkout.py
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── locator.py
│   │   ├── item.py
│   │   └── checkout.py
│   ├── routers/             # FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── locators.py
│   │   ├── sublocators.py
│   │   ├── items.py
│   │   ├── inventory.py
│   │   └── checkouts.py
│   ├── crud/                # Database operations
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── locator.py
│   │   ├── item.py
│   │   └── checkout.py
│   ├── dependencies/        # Reusable Depends() functions
│   │   ├── __init__.py
│   │   ├── auth.py          # get_current_user, require_admin
│   │   └── pagination.py
│   └── utils/
│       ├── __init__.py
│       └── seed.py          # Admin + category seed
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_locators.py
│   ├── test_items.py
│   ├── test_inventory.py
│   └── test_checkouts.py
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── requirements.txt
├── requirements-dev.txt
├── .env.example
└── Dockerfile
```

### 7.2 Configuration

```python
# app/config.py
class Settings(BaseSettings):
    database_url: str = "sqlite:///./school_inventory.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    admin_username: str = "admin"
    admin_email: str = "admin@school.edu"
    admin_password: str
    cors_origins: list[str] = ["http://localhost:5173"]
    environment: str = "development"
    default_checkout_days: int = 7
```

### 7.3 Authentication Design

- **Access token:** Short-lived (30 min), stateless JWT, sent as `Authorization: Bearer <token>`
- **Refresh token:** Long-lived (7 days), sent only to `/auth/refresh` and `/auth/logout`
- **JWT payload:** `{ "sub": user_id, "exp": expiry, "type": "access"|"refresh" }`
- **Password hashing:** bcrypt with 12 rounds
- **Dependencies:** `get_current_user` (validates access token), `require_admin` (checks role)

### 7.4 Complete Endpoint Reference

#### Authentication (`/api/v1/auth`)

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/token` | Login (OAuth2 form) → access + refresh tokens | None |
| POST | `/auth/refresh` | Exchange refresh token → new access token | None |
| POST | `/auth/logout` | Invalidate refresh token | Bearer |
| GET | `/auth/me` | Get current user profile | Bearer |

#### Users (`/api/v1/users`) — Admin only unless noted

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/users` | List all users (paginated, filterable) | Admin |
| POST | `/users` | Create a new user | Admin |
| GET | `/users/{id}` | Get user by ID | Admin |
| PATCH | `/users/{id}` | Update user (name, email, role, active) | Admin |
| DELETE | `/users/{id}` | Soft-delete (deactivate) | Admin |
| POST | `/users/{id}/reset-password` | Reset user's password | Admin |
| PATCH | `/users/me` | Update own profile (name, email, password) | Any |

#### Locators (`/api/v1/locators`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/locators` | List locators (admin=all, teacher=own) | Any |
| POST | `/locators` | Create locator | Any |
| GET | `/locators/{id}` | Get locator with sublocators | Owner/Admin |
| PATCH | `/locators/{id}` | Update locator | Owner/Admin |
| DELETE | `/locators/{id}` | Delete (blocked if has inventory) | Admin |

#### Sublocators (`/api/v1/locators/{locator_id}/sublocators`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `.../sublocators` | List sublocators in a locator | Owner/Admin |
| POST | `.../sublocators` | Create sublocator | Owner/Admin |
| GET | `.../sublocators/{id}` | Get sublocator with inventory | Owner/Admin |
| PATCH | `.../sublocators/{id}` | Update sublocator | Owner/Admin |
| DELETE | `.../sublocators/{id}` | Delete (blocked if has inventory) | Owner/Admin |

#### Items (`/api/v1/items`) — Catalog

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/items` | List items (search, category filter) | Any |
| POST | `/items` | Add item to catalog | Admin |
| GET | `/items/{id}` | Get item with stock summary | Any |
| PATCH | `/items/{id}` | Update catalog entry | Admin |
| DELETE | `/items/{id}` | Delete (blocked if in inventory/checkouts) | Admin |

#### Inventory (`/api/v1/inventory`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/inventory` | List inventory (filterable by locator, item, low_stock) | Any (scoped) |
| POST | `/inventory` | Add item to a sublocator | Owner/Admin |
| GET | `/inventory/{id}` | Get inventory record | Owner/Admin |
| PATCH | `/inventory/{id}` | Update quantity/min_quantity | Owner/Admin |
| DELETE | `/inventory/{id}` | Remove (blocked if open checkouts) | Owner/Admin |
| POST | `/inventory/{id}/adjust` | Stock adjustment with reason | Owner/Admin |

#### Checkouts (`/api/v1/checkouts`)

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/checkouts` | Create checkout (decrements inventory) | Any |
| GET | `/checkouts` | List checkouts (status, borrower, item filters) | Any (scoped) |
| GET | `/checkouts/{id}` | Get checkout detail | Borrower/Owner/Admin |
| POST | `/checkouts/{id}/return` | Return items (increments inventory) | Borrower/Owner/Admin |
| POST | `/checkouts/{id}/extend` | Extend due date | Owner/Admin |
| GET | `/checkouts/overdue` | All overdue checkouts | Any (scoped) |
| GET | `/checkouts/summary` | Dashboard stats | Any (scoped) |

### 7.5 Standard Response Formats

**Paginated List:**
```json
{ "total": 42, "skip": 0, "limit": 20, "items": [...] }
```

**Error:**
```json
{ "detail": "Insufficient stock: requested 5, available 3", "code": "INSUFFICIENT_STOCK" }
```

**HTTP Status Codes:** 200 (read), 201 (create), 204 (delete), 400 (business rule), 401 (no auth), 403 (forbidden), 404 (not found), 409 (duplicate), 422 (validation), 500 (server error)

### 7.6 Swagger/OpenAPI

Auto-generated at `/docs` (Swagger UI) and `/redoc` (ReDoc). Each router uses tags. All schemas have `json_schema_extra` examples. Disabled in production.

---

## 8. Frontend Architecture

### 8.1 Project Structure

```
frontend/
├── src/
│   ├── assets/styles/ (main.scss, variables.scss)
│   ├── components/
│   │   ├── common/ (AppNavDrawer, AppTopBar, ConfirmDialog, DataTable, FormDialog, StatusChip, PageHeader, EmptyState)
│   │   ├── auth/ (LoginForm)
│   │   ├── users/ (UserForm, UserRoleChip)
│   │   ├── locators/ (LocatorForm, SublocatorForm)
│   │   ├── catalog/ (ItemForm, CategorySelect)
│   │   ├── inventory/ (StockLevelBadge, InventoryAdjustForm)
│   │   └── checkout/ (CheckoutForm, ReturnForm, OverdueBanner)
│   ├── composables/ (useConfirm, useNotify, usePagination, useFormValidation, useBreakpoint)
│   ├── layouts/ (AuthLayout, AppLayout)
│   ├── views/
│   │   ├── auth/LoginView
│   │   ├── dashboard/DashboardView
│   │   ├── admin/UsersView
│   │   ├── locators/ (LocatorsView, LocatorDetailView)
│   │   ├── catalog/CatalogView
│   │   ├── inventory/InventoryView
│   │   ├── checkout/ (CheckoutView, OverdueView)
│   │   └── profile/ProfileView
│   ├── router/ (index.ts, routes.ts)
│   ├── stores/ (auth, users, locators, catalog, inventory, checkout)
│   ├── api/ (axios.ts, auth.api, users.api, locators.api, catalog.api, inventory.api, checkout.api)
│   ├── types/ (auth, user, locator, catalog, inventory, checkout, shared)
│   ├── plugins/vuetify.ts
│   ├── App.vue
│   └── main.ts
├── tests/ (unit/, e2e/)
├── .env.development, .env.production
├── vite.config.ts, vitest.config.ts, tsconfig.json
├── nginx.conf
├── Dockerfile
└── package.json
```

### 8.2 Routing

All routes use lazy loading via dynamic `import()`.

| Path | View | Auth | Role |
|---|---|---|---|
| `/login` | LoginView | Public | — |
| `/` | DashboardView | Required | Any |
| `/users` | UsersView | Required | Admin |
| `/locators` | LocatorsView | Required | Any |
| `/locators/:id` | LocatorDetailView | Required | Any |
| `/catalog` | CatalogView | Required | Any |
| `/inventory` | InventoryView | Required | Any |
| `/checkouts` | CheckoutView | Required | Any |
| `/checkouts/overdue` | OverdueView | Required | Any |
| `/profile` | ProfileView | Required | Any |

**Navigation Guards:** Redirect to `/login` if not authenticated. Redirect admin-only routes to dashboard for teachers. Redirect `/login` to dashboard if already authenticated.

### 8.3 State Management (Pinia Stores)

Each store follows the pattern: `ref()` for data + loading/error, actions map 1:1 to API methods.

- **auth.store:** user, tokens, login(), logout(), refresh(), fetchProfile(), isAdmin/isTeacher computed
- **users.store:** users list, CRUD actions
- **locators.store:** locators list, CRUD + sublocator actions
- **catalog.store:** items list, categories, CRUD actions
- **inventory.store:** inventory records, adjust action
- **checkout.store:** checkouts list, overdueCount, create/return/extend actions

### 8.4 API Integration (Axios)

- **Request interceptor:** Attaches `Authorization: Bearer <token>` header
- **Response interceptor:** On 401, queues concurrent requests, attempts single token refresh, replays queued requests on success, redirects to login on failure
- **Error normalization:** Converts API error responses to standard `Error` objects

### 8.5 Key Components

- **DataTable.vue:** Wraps `v-data-table-server` with pagination, sorting, search, loading state
- **FormDialog.vue:** Generic dialog with title, form slot, Cancel/Save actions; fullscreen on mobile
- **ConfirmDialog.vue + useConfirm():** Programmatic confirmation via `await confirm({title, message})`
- **useNotify():** Singleton snackbar for success/error toasts
- **AppNavDrawer.vue:** Role-aware navigation items with overdue badge
- **StockLevelBadge.vue:** Green/amber/red chip based on quantity vs threshold
- **EmptyState.vue:** Icon + message + CTA button for empty lists

---

## 9. UI Design System

### 9.1 Color Palette

| Role | Hex | Usage |
|---|---|---|
| Primary (School Blue) | `#1565C0` | App bar, primary buttons, active nav |
| Primary Light | `#64B5F6` | Hover states, chips |
| Primary Dark | `#0D47A1` | Pressed states, headings |
| Secondary (Teal) | `#00796B` | Secondary actions, badges |
| Accent (Amber) | `#F9A825` | CTA highlights, active nav border |
| Error (Red) | `#C62828` | Overdue, errors, delete |
| Warning (Orange) | `#E65100` | Due-soon, low-stock |
| Success (Green) | `#2E7D32` | Available, returned, confirmed |
| Info (Light Blue) | `#0277BD` | Informational banners |
| Background | `#FAFAFA` | Page background |
| Surface | `#FFFFFF` | Cards, dialogs |
| On-Surface | `#212121` | Body text |
| Subtle Text | `#757575` | Secondary text, timestamps |

### 9.2 Typography

Font: **Roboto** (Vuetify default). Scale: h1 (2rem/300), h2 (1.5rem/400), h3 (1.25rem/500), body-1 (1rem/400), body-2 (0.875rem/400), caption (0.75rem/400).

### 9.3 Spacing

Base unit: 4px. Tokens: xs(4), sm(8), md(16), lg(24), xl(32), xxl(48).

### 9.4 Layout

- **Desktop:** 256px persistent sidebar (collapsible to rail), 64px app bar, breadcrumbs
- **Mobile:** 56px app bar with hamburger, temporary drawer, bottom navigation (Dashboard, Inventory, Checkout, Catalog, More)
- **Nav drawer:** Primary-colored background, white text, accent left-border on active item, role badge at bottom

### 9.5 Status Indicators

| State | Color | Icon | Left-border accent |
|---|---|---|---|
| OK / In Stock | Green `#2E7D32` | `mdi-check-circle-outline` | Green |
| Due Soon / Low Stock | Orange `#E65100` | `mdi-clock-alert-outline` / `mdi-alert-outline` | Orange |
| Overdue / Out of Stock | Red `#C62828` | `mdi-alert-circle-outline` | Red |
| Returned | Teal `#00796B` | `mdi-keyboard-return` | — |

### 9.6 Page Wireframes

**Login:** Centered card on blue-tinted background. School icon, email/password fields, sign in button.

**Dashboard:** 4 stat cards (total items, active checkouts, overdue, low stock) → Recent checkouts table → Low stock alerts widget. Mobile: single column, quick actions first.

**Locators:** Tree view with expandable locators showing sublocators. Action buttons per row.

**Catalog:** Searchable/filterable data table with item avatars, category chips, stock badges.

**Inventory:** Grouped by location, with per-item quantity, min threshold, stock status badge.

**Checkouts:** Tabbed (Active/Overdue/History), status-colored cards with return button per row.

**Users (Admin):** Data table with avatar, name, email, role chip, status, overflow action menu.

---

## 10. UX Guidelines

### 10.1 Core Principles

1. **Simplicity first** — Use "Storage Closet" and "Shelf" in UI, not "Locator"/"Sublocator"
2. **Minimize clicks** — Global search always visible, pre-fill known fields, checkout in 3 clicks max
3. **Clear visual hierarchy** — Red=overdue, yellow=due soon, green=ok; always paired with text labels
4. **Forgiving** — Confirmation for destructive actions, undo toast for non-destructive, auto-save drafts

### 10.2 Click Depth Requirements

| Action | Max Clicks |
|---|---|
| View stock for a known item | 2 |
| Check out an item | 3 |
| Return an item (from dashboard) | 1 |
| Add item to existing shelf | 3 |
| View overdue checkouts | 1 (visible on dashboard) |
| Create a new locator | 2 |
| Admin create user | 3 |

### 10.3 Workflows

- **First-time setup:** Guided wizard — Create closet → Add shelves → Add items → Set stock quantities
- **Check stock:** Global search → results show quantity and location inline (no click needed)
- **Checkout:** Item detail → "Check Out" button → slide-in panel (quantity stepper, due date, confirm) → success toast
- **Return:** Dashboard overdue widget → "Mark Returned" → one-click, no confirmation needed (reversible)

### 10.4 Feedback Requirements

| Action | Feedback |
|---|---|
| Record saved | Green toast, auto-dismiss 4s |
| Checkout created | Green toast with item name + due date |
| Validation error | Red inline error below field + summary toast |
| Delete completed | Green toast + "Undo" link (5-second window) |
| Server error | Red toast: "Something went wrong. Please try again." |
| Loading | Skeleton screens for page loads; spinner on triggering button |

### 10.5 Confirmation Rules

**Required for (irreversible):** Delete locator/sublocator/item/user, bulk delete. Dialog names the item and describes consequences. Destructive button is red, never labeled "OK" or "Yes".

**Not required for (reversible):** Editing, creating, returning items.

### 10.6 Empty States

Each empty state includes a descriptive message and a primary CTA button:
- No locators → "Add Storage Closet"
- No items → "Add Item"
- No checkouts → informational only
- No search results → "Add Item" pre-filled with search term

### 10.7 Mobile Usability

- Primary actions in bottom 60% of screen
- 44px minimum touch targets (48px preferred)
- Tables reflow to cards below 960px — no horizontal scrolling
- Forms: stacked vertically, native input types, stepper for quantity, sticky submit button
- Bottom sheets replace overflow menus
- FAB at bottom-right for primary create actions

### 10.8 Accessibility

- All interactive elements reachable by Tab
- Visible focus ring (3:1 contrast)
- Dialogs trap focus; Escape returns focus to trigger
- ARIA labels on all icon-only buttons
- `aria-live="polite"` for toasts
- Color never sole indicator — always paired with text
- WCAG AA contrast ratios on all text (4.5:1 body, 3:1 large/UI)

### 10.9 Dashboard Design

**Teacher:** Overdue checkouts (red, top) → Active checkouts → Global search → Low stock → Quick actions

**Admin:** Overdue checkouts (all users) → Low stock → Recent activity feed → System stats → Quick actions

**Overdue widget:** Red-bordered card, each row has item/borrower/days overdue + "Mark Returned" button. 5+ items shows "View all N overdue" link.

---

## 11. Python Best Practices

### 11.1 Architecture Layers

```
Router (HTTP) → Service (business logic) → Repository (DB queries) → Model (schema)
```

- **Routers:** Receive request, call service, return response. No raw SQL or business logic.
- **Services:** Business logic, orchestration. Call repositories.
- **Repositories:** All database queries. Accept Session, return ORM instances.
- **Models:** SQLAlchemy table definitions only.
- **Schemas:** Pydantic models only. Separate Create/Update/Read classes.

### 11.2 Code Quality

- Type hints on every function signature. Run `mypy` in strict mode.
- Pydantic `Field` constraints on all inputs (min_length, max_length, ge, le).
- Custom exception classes (`NotFoundError`, `ConflictError`) with global handlers.
- Python `logging` module, never `print()`. Never log passwords/tokens.

### 11.3 Security

- **bcrypt** rounds=12, via `passlib.context.CryptContext`
- **JWT type claim:** Validate `"type": "access"` to prevent refresh token misuse
- **SQLAlchemy ORM** prevents SQL injection — never interpolate user input into queries
- **CORS:** Explicit origins only, never `allow_origins=["*"]` with credentials

### 11.4 Testing

- In-memory SQLite with transaction rollback per test for isolation
- `dependency_overrides[get_db]` injects test session
- Test categories: unit (crud functions), integration (multi-step flows), API (HTTP contracts)
- Coverage targets: 90% overall, 100% on security utilities
- Mock only external services, never the database

### 11.5 Performance

- **Sync route handlers** (`def`, not `async def`) — SQLite doesn't benefit from async
- **WAL mode** + foreign keys via SQLAlchemy `@event.listens_for(engine, "connect")`
- **Pagination** on all list endpoints with `skip`/`limit` params
- **uvicorn --workers 1** — SQLite single-writer lock

---

## 12. Testing Strategy

### 12.1 Backend Tests (pytest)

```
tests/
├── conftest.py         # test DB, client fixture, auth token fixtures
├── test_auth.py        # login, refresh, logout, me
├── test_users.py       # CRUD, role enforcement, password reset
├── test_locators.py    # CRUD, ownership, delete protection
├── test_items.py       # CRUD, category filter, delete protection
├── test_inventory.py   # CRUD, adjust, low stock
└── test_checkouts.py   # checkout, return, extend, overdue, insufficient stock
```

**Run:** `cd backend && pytest -v --cov=app --cov-report=term-missing`

### 12.2 Frontend Tests (Vitest)

```
tests/unit/
├── components/        # Component rendering, props, events
└── stores/            # Store actions, state mutations
```

**Run:** `cd frontend && npx vitest run --coverage`

### 12.3 E2E Tests (Puppeteer)

```
tests/e2e/
├── helpers/
│   ├── auth.helper.ts    # login() utility
│   └── browser.ts        # launch/close browser
├── 01-login.spec.ts
├── 02-admin-users.spec.ts
├── 03-locators.spec.ts
├── 04-catalog.spec.ts
├── 05-inventory.spec.ts
├── 06-checkout-return.spec.ts
└── 07-overdue.spec.ts
```

**Scenarios covered:**
1. Login with valid/invalid credentials
2. Admin creates and deactivates a user
3. Create locator with sublocators
4. Add items to catalog
5. Add inventory to sublocator
6. Checkout items, verify stock decremented
7. Return items, verify stock restored
8. Verify overdue display after due date passes
9. Mobile navigation works (responsive)

**Run E2E:**
```bash
# Terminal 1: Start backend
cd backend && uvicorn app.main:app --port 8000

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Reset DB and run tests
./scripts/reset_db.sh
cd frontend && npx puppeteer test
```

---

## 13. Implementation Plan

### Phase 1: Project Setup
1. Create `backend/` and `frontend/` directory structure
2. Set up Python venv, `requirements.txt`, `requirements-dev.txt`
3. Set up Vue3 project with Vite (`npm create vue@latest`)
4. Install Vuetify 3, Pinia, Vue Router, Axios, TypeScript
5. Create `.env.example` files for both backend and frontend
6. Create `docker-compose.yml` skeleton
7. Initialize Alembic for migrations

### Phase 2: Database & API (Backend)
1. Create SQLAlchemy models (`models/`)
2. Create initial Alembic migration
3. Implement `database.py` with pragma listener
4. Implement `config.py` with pydantic-settings
5. Implement seed utility (admin user + categories)
6. Implement Pydantic schemas (`schemas/`)
7. Implement CRUD operations (`crud/`)
8. Implement auth dependencies (`dependencies/auth.py`)
9. Implement auth router (login, refresh, logout, me)
10. Implement users router (CRUD, password reset)
11. Implement locators router (CRUD)
12. Implement sublocators router (CRUD, nested under locators)
13. Implement items router (CRUD, catalog)
14. Implement inventory router (CRUD, adjust)
15. Implement checkouts router (checkout, return, extend, overdue, summary)
16. Configure CORS, error handlers, request ID middleware
17. Configure Swagger docs with tags and examples
18. **Write and run all backend tests — fix until passing**

### Phase 3: Frontend (UI)
1. Configure Vuetify theme (colors, typography, component defaults)
2. Create layout components (AuthLayout, AppLayout, AppNavDrawer, AppTopBar)
3. Set up Axios instance with interceptors
4. Create auth store + LoginView
5. Set up Vue Router with navigation guards
6. Create reusable components (DataTable, FormDialog, ConfirmDialog, EmptyState, StatusChip)
7. Implement DashboardView (stat cards, overdue/low-stock widgets)
8. Implement UsersView (admin user management)
9. Implement LocatorsView + LocatorDetailView (with sublocators)
10. Implement CatalogView (items + categories)
11. Implement InventoryView (stock levels, adjustments)
12. Implement CheckoutView + OverdueView (checkout, return, extend)
13. Implement ProfileView (password change)
14. Add responsive breakpoints (mobile card layouts, bottom nav, FAB)
15. **Write and run frontend unit tests — fix until passing**

### Phase 4: E2E Testing
1. Create database reset script (`scripts/reset_db.sh`)
2. Set up Puppeteer test infrastructure (helpers, config)
3. Write E2E tests for all user stories
4. Run both API and UI servers
5. Run Puppeteer tests
6. Fix any failures, console warnings, or console errors
7. Reset DB and re-run until all tests pass cleanly

### Phase 5: Production Readiness
1. Create backend Dockerfile (multi-stage, non-root user, healthcheck)
2. Create frontend Dockerfile (multi-stage with nginx)
3. Create `docker-compose.yml` with both services + named volume
4. Create comprehensive `README.md`
5. Final review and cleanup

---

## 14. Docker Compose Design

```yaml
version: "3.9"
services:
  backend:
    build:
      context: ./backend
      target: runtime
    ports:
      - "8000:8000"
    volumes:
      - sqlite_data:/data
    environment:
      - DATABASE_URL=sqlite:////data/school_inventory.db
      - SECRET_KEY=${SECRET_KEY}
      - ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
      - ADMIN_EMAIL=${ADMIN_EMAIL:-admin@school.edu}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - CORS_ORIGINS=["http://localhost:5173","http://localhost"]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  sqlite_data:
```

---

## 15. README Requirements

The final `README.md` must include:

1. **Project Overview** — What the system does, who it's for
2. **Screenshots** — Dashboard, checkout flow, mobile view
3. **Architecture** — Backend (FastAPI + SQLite) + Frontend (Vue3 + Vuetify)
4. **Prerequisites** — Python 3.12+, Node 20+, Docker (optional)
5. **Quick Start (Development)**
   - Clone, create venv, install deps
   - Copy `.env.example` → `.env`, set secrets
   - Run migrations and seed
   - Start backend (`uvicorn`) and frontend (`npm run dev`)
6. **Quick Start (Docker)**
   - `docker compose up --build`
   - Default admin credentials
7. **API Documentation** — Link to `/docs` (Swagger)
8. **Environment Variables** — Reference table
9. **Running Tests** — Backend, frontend, E2E
10. **Database Reset** — How to reset for testing
11. **Project Structure** — Directory overview
12. **Contributing** — Code style, PR process
