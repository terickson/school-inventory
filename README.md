# School Supply Inventory Management System

A web-based inventory management system for tracking school supplies across physical storage locations. Teachers can browse items, perform self-service checkouts and returns, while admins manage the entire catalog, locations, users, and oversight of all checkouts.

## Features

- **Two-level location hierarchy** (Locator/Closet + Sublocator/Shelf)
- **Quantity-based tracking** — designed for consumable supplies, not asset tags
- **Checkout/Return system** for tracking borrowed items (partial returns supported)
- **Role-based access control** — Admin and Teacher roles
- **Dashboard** with summary stats and low-stock alerts
- **Responsive mobile-first UI** — optimized for phones with bottom navigation, stacked data tables, and touch-friendly action menus
- **Self-hosted and free** — no per-seat licensing

## User Roles & Permissions

The system uses **role-based access control (RBAC)** with two roles and resource ownership rules.

### Role Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMINISTRATOR                                │
│                                                                     │
│  Full system access. Manages users, catalog, categories,            │
│  all locations, all inventory, all checkouts. Can download           │
│  database backups.                                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                          TEACHER                                    │
│                                                                     │
│  Manages own storage locations and shelves. Can browse               │
│  the full catalog and create checkouts for themselves.              │
│  Can view and return their own checkouts, or checkouts              │
│  from locations they own.                                           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                       UNAUTHENTICATED                               │
│                                                                     │
│  Can only access the login page. All other routes                   │
│  and API endpoints require authentication.                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### API Permissions by Endpoint

```
Legend:  ● = full access    ◐ = own resources only    ○ = no access

┌──────────────────────────────────┬───────────┬───────────┐
│ Endpoint                         │   Admin   │  Teacher  │
├──────────────────────────────────┼───────────┼───────────┤
│ AUTH                             │           │           │
│  POST /auth/token (login)        │  public   │  public   │
│  POST /auth/refresh              │  public   │  public   │
│  GET  /auth/me                   │     ●     │     ●     │
├──────────────────────────────────┼───────────┼───────────┤
│ USERS                            │           │           │
│  GET    /users                   │     ●     │     ○     │
│  POST   /users                   │     ●     │     ○     │
│  GET    /users/{id}              │     ●     │     ○     │
│  PATCH  /users/{id}              │     ●     │     ○     │
│  DELETE /users/{id}              │     ●     │     ○     │
│  POST   /users/{id}/reset-pwd    │     ●     │     ○     │
│  GET    /users/me                │     ●     │     ●     │
│  PATCH  /users/me                │     ●     │     ●     │
├──────────────────────────────────┼───────────┼───────────┤
│ CATEGORIES                       │           │           │
│  GET    /categories              │     ●     │     ●     │
│  POST   /categories              │     ●     │     ○     │
│  GET    /categories/{id}         │     ●     │     ●     │
│  PATCH  /categories/{id}         │     ●     │     ○     │
│  DELETE /categories/{id}         │     ●     │     ○     │
├──────────────────────────────────┼───────────┼───────────┤
│ ITEMS (Catalog)                  │           │           │
│  GET    /items                   │     ●     │     ●     │
│  POST   /items                   │     ●     │     ○     │
│  GET    /items/{id}              │     ●     │     ●     │
│  PATCH  /items/{id}              │     ●     │     ○     │
│  DELETE /items/{id}              │     ●     │     ○     │
│  POST   /items/{id}/image        │     ●     │     ○     │
│  DELETE /items/{id}/image        │     ●     │     ○     │
├──────────────────────────────────┼───────────┼───────────┤
│ LOCATIONS                        │           │           │
│  GET    /locators                │     ●     │  ◐ own    │
│  POST   /locators                │     ●     │     ●     │
│  GET    /locators/{id}           │     ●     │  ◐ own    │
│  PATCH  /locators/{id}           │     ●     │  ◐ own    │
│  DELETE /locators/{id}           │     ●     │     ○     │
├──────────────────────────────────┼───────────┼───────────┤
│ SHELVES                          │           │           │
│  GET    /locators/{id}/sublocs   │     ●     │  ◐ own    │
│  POST   /locators/{id}/sublocs   │     ●     │  ◐ own    │
│  PATCH  .../sublocs/{id}         │     ●     │  ◐ own    │
│  DELETE .../sublocs/{id}         │     ●     │  ◐ own    │
├──────────────────────────────────┼───────────┼───────────┤
│ INVENTORY                        │           │           │
│  GET    /inventory               │     ●     │     ●     │
│  POST   /inventory               │     ●     │  ◐ own    │
│  GET    /inventory/{id}          │     ●     │  ◐ own    │
│  PATCH  /inventory/{id}          │     ●     │  ◐ own    │
│  DELETE /inventory/{id}          │     ●     │  ◐ own    │
│  POST   /inventory/{id}/adjust   │     ●     │  ◐ own    │
├──────────────────────────────────┼───────────┼───────────┤
│ CHECKOUTS                        │           │           │
│  GET    /checkouts               │     ●     │  ◐ own    │
│  POST   /checkouts               │     ●     │  ◐ self   │
│  GET    /checkouts/{id}          │     ●     │  ◐ own¹   │
│  POST   /checkouts/{id}/return   │     ●     │  ◐ own¹   │
│  GET    /checkouts/summary       │     ●     │  ◐ own    │
├──────────────────────────────────┼───────────┼───────────┤
│ ADMIN                            │           │           │
│  GET    /admin/backup            │     ●     │     ○     │
├──────────────────────────────────┼───────────┼───────────┤
│ UPLOADS                          │           │           │
│  GET    /uploads/{filename}      │     ●     │     ●     │
└──────────────────────────────────┴───────────┴───────────┘

¹ Teachers can access checkouts they created OR checkouts
  from inventory in locations they own.
```

### UI Visibility by Role

```
┌──────────────────────────────────┬───────────┬───────────┐
│ UI Element                       │   Admin   │  Teacher  │
├──────────────────────────────────┼───────────┼───────────┤
│ SIDEBAR NAVIGATION               │           │           │
│  Dashboard                       │  visible  │  visible  │
│  Locations                       │  visible  │  visible  │
│  Catalog                         │  visible  │  visible  │
│  Categories                      │  visible  │  hidden   │
│  Inventory                       │  visible  │  visible  │
│  Checkouts                       │  visible  │  visible  │
│  Users                           │  visible  │  hidden   │
├──────────────────────────────────┼───────────┼───────────┤
│ PAGES (route-level access)       │           │           │
│  /users                          │  allowed  │  blocked  │
│  /categories                     │  allowed  │  blocked  │
│  All other pages                 │  allowed  │  allowed  │
├──────────────────────────────────┼───────────┼───────────┤
│ ACTION BUTTONS                   │           │           │
│  Add Item (catalog)              │  visible  │  hidden   │
│  Edit/Delete Item (catalog)      │  visible  │  hidden   │
│  Upload/Remove Item Image        │  visible  │  hidden   │
│  Add Category                    │  visible  │  hidden   │
│  Edit/Delete Category            │  visible  │  hidden   │
│  Add Stock (inventory)           │  visible  │  hidden   │
│  Checkout on behalf of others    │  visible  │  hidden   │
│  New Checkout (for self)         │  visible  │  visible  │
│  Return Items                    │  visible  │  visible  │
└──────────────────────────────────┴───────────┴───────────┘
```

### Ownership Model

Teachers have a **resource ownership** model for storage locations:

```
Teacher creates a Location (closet)
        │
        ├── Teacher owns all Shelves within it
        ├── Teacher can manage Inventory in those shelves
        └── Teacher can view/return Checkouts from those locations
```

- When a teacher creates a location, they become its owner
- Ownership grants access to all nested resources (shelves, inventory)
- Teachers can see and return checkouts from locations they own, even if another user initiated the checkout
- Admins bypass all ownership checks and can access everything

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  Vue 3 + Vuetify 3 SPA                             │
│  (Pinia state, Vue Router, Axios HTTP client)       │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP / REST
                       ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (Python)                │
│  /api/v1/auth   /api/v1/users   /api/v1/locators    │
│  /api/v1/items  /api/v1/inventory /api/v1/checkouts  │
│  JWT Auth │ SQLAlchemy ORM │ Alembic Migrations     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  SQLite (WAL)  │
              └────────────────┘
```

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | Vue 3, Vuetify 3, Pinia, Vue Router, Axios, Vite |
| Backend  | FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2   |
| Auth     | JWT (python-jose) + bcrypt (passlib)             |
| Database | SQLite with WAL mode                             |
| Testing  | pytest + httpx (backend), Vitest (frontend), Puppeteer (E2E) |
| Deploy   | Docker Compose                                   |

## Prerequisites

- **Python 3.12+**
- **Node.js 20+** and npm
- **Docker & Docker Compose** (optional, for containerized deployment)

## Quick Start (Development)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start the server (auto-seeds admin user)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to backend)
npm run dev
```

The app is now available at **http://localhost:5173**.

### Default Admin Credentials

| Field    | Value           |
|----------|-----------------|
| Username | `admin`         |
| Password | `AdminPass123!` |

## Quick Start (Docker)

```bash
# Build and start all services
docker compose up -d

# Access the app
# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
```

To customize credentials, create a `.env` file:

```env
SECRET_KEY=your-secure-secret-key
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@school.edu
ADMIN_PASSWORD=YourSecurePassword!
```

## Raspberry Pi Setup

A one-time setup script prepares a Raspberry Pi (Raspberry Pi OS / Debian-based) with all prerequisites and an Nginx reverse proxy.

```bash
# Download and run the setup script
curl -fsSL https://github.com/terickson/school-inventory/raw/refs/heads/main/scripts/rpi-setup.sh -o rpi-setup.sh
chmod +x rpi-setup.sh
sudo ./rpi-setup.sh
```

This installs:
- **curl**, **unzip**, **rsync** — required by the deploy script
- **Docker** and **Docker Compose** plugin
- **Nginx** — configured as a reverse proxy on port 80, forwarding to the frontend (8080) and backend (8000)

It also creates the `/opt/apps/school-inventory` and `/opt/apps/school-inventory-backups` directories. After setup, run the deploy script to install the application.

### IP Notification via ntfy

The setup script can optionally install a [ntfy.sh](https://ntfy.sh) notification hook that sends the Pi's IP address to your phone whenever it gets a DHCP lease. This is useful for headless setups where the Pi's IP may change.

```bash
sudo ./rpi-setup.sh --ntfy-topic my-school-pi
```

To receive notifications:

1. Install the **ntfy** app ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [iOS](https://apps.apple.com/app/ntfy/id1625396347))
2. Subscribe to the same topic name you passed to the script (e.g., `my-school-pi`)
3. The Pi will send a push notification with its IP every time an interface comes up or renews a DHCP lease

This installs a NetworkManager dispatcher script at `/etc/NetworkManager/dispatcher.d/50-ntfy-ip`. No account or API key is required — ntfy.sh is a free, open service. Choose a unique, hard-to-guess topic name since anyone who knows the topic can see the messages.

### Nightly Database Backups

The setup script automatically installs a cron job that backs up the SQLite database every night at 2:00 AM, with 7-day retention.

- **Backup location:** `/opt/apps/school-inventory-backups/`
- **Schedule:** Daily at 2:00 AM (`/etc/cron.d/school-inventory-backup`)
- **Retention:** Backups older than 7 days are automatically deleted
- **Log:** `/var/log/school-inventory-backup.log`

The backup uses the SQLite backup API (`sqlite3 .backup`) via a temporary Docker container, so it's safe to run while the application is active. If an `--ntfy-topic` was provided during setup, the backup script will send a push notification on failure.

To run a backup manually:

```bash
sudo /opt/apps/school-inventory/scripts/nightly-backup.sh
```

To list existing backups:

```bash
ls -lh /opt/apps/school-inventory-backups/
```

## Deploy via GitHub Zip

A deploy script handles both initial installation and updates. It downloads the repo as a zip from GitHub, extracts to `/opt/apps/school-inventory`, and manages Docker Compose.

### Initial Install

```bash
# Download the deploy script
curl -fsSL https://github.com/terickson/school-inventory/raw/refs/heads/main/scripts/deploy.sh -o deploy.sh
chmod +x deploy.sh

# Run it (requires sudo for /opt/apps)
sudo ./deploy.sh
```

This will:
1. Download and extract the latest code to `/opt/apps/school-inventory`
2. Generate a `.env` with a random `SECRET_KEY`
3. Build and start all Docker containers
4. Wait for the backend health check to pass

### Update an Existing Installation

```bash
sudo /opt/apps/school-inventory/scripts/deploy.sh
```

This will:
1. Back up the SQLite database (with WAL checkpoint) to `/opt/apps/school-inventory-backups/`
2. Preserve the existing `.env` file
3. Stop running containers gracefully
4. Download and extract the latest code (database files are preserved in the Docker volume)
5. Restore the `.env` file
6. Rebuild and restart containers (Alembic migrations run automatically on backend startup)

### Options

```bash
sudo ./deploy.sh --branch develop    # Deploy a specific branch
sudo ./deploy.sh --no-backup         # Skip database backup
sudo ./deploy.sh --help              # Show usage
```

### Backups

Database backups are saved to `/opt/apps/school-inventory-backups/` with timestamps. To restore a backup:

```bash
# Stop the backend
cd /opt/apps/school-inventory && docker compose down

# Copy backup into the Docker volume
docker run --rm \
  -v school-inventory_sqlite_data:/data \
  -v /opt/apps/school-inventory-backups:/backup \
  alpine:latest \
  cp /backup/school_inventory_YYYYMMDD_HHMMSS.db /data/school_inventory.db

# Restart
docker compose up -d
```

### Database Administration

A lightweight Alpine-based container is available for direct SQLite database access. It shares the same data volume as the backend and includes `sqlite3`, `bash`, and `less`.

The container is behind a Docker Compose profile so it doesn't run by default:

```bash
# Start the db-admin container alongside the app
docker compose --profile tools up -d

# Exec into the container
docker compose exec db-admin bash

# Open the database
sqlite3 /data/school_inventory.db
```

Common `sqlite3` commands:

```sql
.tables                                          -- List all tables
.schema users                                    -- Show table schema
SELECT * FROM users;                             -- Query users
SELECT i.name, inv.quantity, inv.min_quantity
  FROM inventory inv JOIN items i ON i.id = inv.item_id
  WHERE inv.quantity < inv.min_quantity;          -- Low stock report
PRAGMA integrity_check;                          -- Verify database integrity
.quit                                            -- Exit
```

> **Warning:** This container has read/write access to the live production database. SQLite WAL mode means reads won't block the backend, but manual writes could cause `SQLITE_BUSY` errors if the backend is also writing. Use `BEGIN IMMEDIATE` for any manual write transactions.

## API Documentation

When running in development mode, interactive API docs are available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Database Backup

Admins can download a complete backup of the SQLite database.

First, obtain an admin access token by logging in:

```bash
# Log in to get an access token
curl -X POST http://localhost:8000/api/v1/auth/token \
  -d "username=admin&password=AdminPass123!" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

This returns a JSON response containing `access_token`. Use it to download the backup:

```bash
# Download the database backup
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/api/v1/admin/backup \
  -o school_inventory_backup.db
```

Or as a one-liner:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -d "username=admin&password=AdminPass123!" \
  -H "Content-Type: application/x-www-form-urlencoded" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/admin/backup -o school_inventory_backup.db
```

This uses the SQLite backup API to create a consistent snapshot of the database, including any in-flight WAL data. Only admin users can access this endpoint.

## Environment Variables

| Variable                     | Default                          | Description                        |
|------------------------------|----------------------------------|------------------------------------|
| `DATABASE_URL`               | `sqlite:///./school_inventory.db`| SQLite connection string           |
| `SECRET_KEY`                 | `dev-secret-key-...`             | JWT signing secret                 |
| `ALGORITHM`                  | `HS256`                          | JWT algorithm                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `30`                             | Access token TTL                   |
| `REFRESH_TOKEN_EXPIRE_DAYS`  | `7`                              | Refresh token TTL                  |
| `ADMIN_USERNAME`             | `admin`                          | Default admin username             |
| `ADMIN_EMAIL`                | `admin@school.edu`               | Default admin email                |
| `ADMIN_PASSWORD`             | `AdminPass123!`                  | Default admin password             |
| `CORS_ORIGINS`               | `["http://localhost:5173"]`      | Allowed CORS origins               |
| `ENVIRONMENT`                | `development`                    | `development` or `production`      |
| `UPLOAD_DIR`                 | `uploads`                        | Directory for item images          |
| `MAX_IMAGE_SIZE_MB`          | `5`                              | Max image upload size in MB        |

## Running Tests

### Backend Tests

```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Tests

```bash
cd frontend
npm run test:unit
```

### E2E Tests (Puppeteer)

```bash
# 1. Reset the database
./scripts/reset_db.sh

# 2. Start backend and frontend
cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000 &
cd frontend && npm run dev &

# 3. Wait for servers, then run tests
cd /path/to/school-inventory
npx jest --config jest.config.ts --runInBand
```

## Database Reset

To reset the database to a clean state with only the admin user and default categories:

```bash
./scripts/reset_db.sh
```

## Project Structure

```
school-inventory/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── config.py         # Settings from env vars
│   │   ├── database.py       # SQLAlchemy engine & session
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── crud/             # Database operations
│   │   ├── dependencies/     # Auth & pagination deps
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routers/          # API route handlers
│   │   ├── schemas/          # Pydantic request/response models
│   │   └── utils/            # Seed data, helpers
│   ├── tests/                # Backend tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API client modules
│   │   ├── components/       # Reusable Vue components
│   │   ├── composables/      # Vue composables (hooks)
│   │   ├── layouts/          # App & Auth layouts
│   │   ├── plugins/          # Vuetify plugin setup
│   │   ├── router/           # Vue Router config
│   │   ├── stores/           # Pinia stores
│   │   ├── types/            # TypeScript type definitions
│   │   └── views/            # Page-level components
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   ├── reset_db.sh           # Database reset script
│   ├── deploy.sh             # GitHub zip-based install/update
│   └── rpi-setup.sh          # Raspberry Pi initial setup
├── tests/
│   └── e2e/                  # Puppeteer E2E tests
├── docker-compose.yml
└── README.md
```

## User Guide

### Admin Setup

1. Log in with the default admin credentials
2. Navigate to **Locations** to create storage closets and shelves
3. Navigate to **Catalog** to add items to the catalog
4. Navigate to **Inventory** to add stock (assign items to locations with quantities)
5. Navigate to **Users** to create teacher accounts

### Teacher Workflow

1. Log in with teacher credentials
2. Browse **Catalog** or **Inventory** to find items
3. Navigate to **Checkouts** to borrow items
4. Return items when done via the **Checkouts** page

### Checkout Process

1. Go to **Checkouts** and click **New Checkout**
2. Select the inventory item (shown with location and available quantity)
3. Enter the quantity to borrow
4. Click **Save** to complete the checkout
5. The available quantity in inventory decreases automatically
6. To return, find the checkout and click **Return**
7. Enter the quantity to return (partial returns are supported)
8. The inventory quantity is restored upon return. If only some items are returned, the checkout stays active until all items are back
