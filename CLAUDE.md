# School Supply Inventory Management System

## Project Overview

A web-based inventory management system for schools. Teachers track supplies in physical storage locations (locators/sublocators), manage an item catalog, and check out items for specific time periods. Two roles: Admin (manages users, full access) and Teacher (manages own locations and checkouts).

## Architecture

- **Backend:** Python FastAPI REST API with SQLite database (`backend/`)
- **Frontend:** Vue 3 + Vuetify 3 SPA with TypeScript (`frontend/`)
- **E2E Tests:** Puppeteer with Jest (`tests/e2e/`)
- **Deployment:** Docker Compose (`docker-compose.yml`)

## Tech Stack

- Backend: FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, python-jose (JWT), passlib (bcrypt)
- Frontend: Vue 3 (Composition API), Vuetify 3, Pinia, Vue Router, Axios, Vite, TypeScript
- Database: SQLite with WAL mode
- Testing: pytest (backend), Vitest (frontend), Puppeteer (E2E)

## Project Structure

```
backend/
  app/
    main.py          # FastAPI app, lifespan, CORS, router registration
    config.py        # pydantic-settings, reads .env
    database.py      # SQLAlchemy engine, session, PRAGMA listener
    models/          # SQLAlchemy ORM models (user, item, locator, checkout)
    schemas/         # Pydantic request/response schemas
    routers/         # FastAPI route handlers (auth, users, locators, sublocators, items, inventory, checkouts, admin)
    crud/            # Database query functions
    dependencies/    # auth (JWT, get_current_user, require_admin), pagination
    utils/seed.py    # Idempotent admin user + category seeding
  tests/             # pytest tests
  alembic/           # Database migrations
  requirements.txt

frontend/
  src/
    api/             # Axios instance + per-resource API modules
    components/      # Reusable Vue components (common/, domain-specific/)
    composables/     # useConfirm, useNotify, useBreakpoint
    layouts/         # AuthLayout, AppLayout
    plugins/         # Vuetify configuration
    router/          # Vue Router with auth guards
    stores/          # Pinia stores (auth, users, locators, catalog, inventory, checkout)
    types/           # TypeScript interfaces
    views/           # Page-level components

tests/e2e/           # Puppeteer E2E tests
scripts/reset_db.sh  # Database reset for testing
```

## Key Commands

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --port 8000 --reload    # Run dev server
pytest -v                                      # Run tests
alembic upgrade head                           # Run migrations
alembic revision --autogenerate -m "desc"      # Create migration

# Frontend
cd frontend
npm run dev                                    # Run dev server (port 5173)
npm run build                                  # Production build
npm run test:unit                              # Run unit tests

# E2E
./scripts/reset_db.sh                          # Reset database
npx jest --config jest.config.ts --runInBand   # Run Puppeteer tests

# Docker
docker compose up --build                      # Run everything
docker compose --profile tools up -d           # Include db-admin container
docker compose exec db-admin bash              # Shell into db-admin
sqlite3 /data/school_inventory.db              # Open DB inside db-admin
```

## API

All endpoints under `/api/v1/`. Swagger docs at `/docs`. Key endpoint groups:
- `/auth/` — Login (POST /token), refresh, me
- `/users/` — Admin user management
- `/locators/` — Storage locations (closets)
- `/locators/{id}/sublocators/` — Shelves within locations
- `/items/` — Item catalog + `/items/categories`
- `/inventory/` — Stock levels per location
- `/checkouts/` — Checkout, return, extend, overdue, summary
- `/admin/backup` — Download SQLite database backup (admin only)

## Development Conventions

- Backend uses **sync** route handlers (`def`, not `async def`) — SQLite doesn't benefit from async
- All API responses are paginated: `{ total, skip, limit, items: [...] }`
- JWT auth: access tokens (30min) + refresh tokens (7 days), both with `type` claim
- Checkout and return operations are **atomic** (inventory quantity updated in same transaction)
- Users are **soft-deleted** (is_active=false), never hard-deleted
- Frontend uses `<script setup lang="ts">` everywhere (Vue 3 Composition API)
- All interactive elements have `data-testid` attributes for E2E testing
- UI uses "Storage Location"/"Location" and "Shelf" in user-facing text, not "Locator"/"Sublocator"

## Domain Terminology

| Concept | Code term | UI term |
|---|---|---|
| Storage closet | Locator | Location |
| Shelf within closet | Sublocator | Shelf |
| Borrowing items | Checkout | Checkout |
| System manager | admin (role) | Administrator |
| Item borrower | teacher (role) | Teacher |

## Default Credentials

- Admin: `admin` / `AdminPass123!` (configured via .env)

## Environment Variables

Backend reads from `backend/.env`. Key vars:
- `DATABASE_URL` — SQLite connection string
- `SECRET_KEY` — JWT signing key
- `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — Initial admin account
- `CORS_ORIGINS` — Allowed frontend origins
- `DEFAULT_CHECKOUT_DAYS` — Default loan period

Frontend uses `VITE_API_BASE_URL` (default: `/api/v1`).

## Testing

- Backend: 86 pytest tests covering all endpoints, auth, CRUD, edge cases
- E2E: 27 Puppeteer tests covering login, user management, locators, catalog, inventory, checkout/return, dashboard
- Reset DB before E2E runs: `./scripts/reset_db.sh`
