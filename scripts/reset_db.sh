#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="${PROJECT_DIR}/backend/school_inventory.db"

# Remove existing database
rm -f "${DB_PATH}" "${DB_PATH}-wal" "${DB_PATH}-shm"

# Remove uploaded images
rm -rf "${PROJECT_DIR}/backend/uploads"

# Run migrations and seed
cd "${PROJECT_DIR}/backend"
source venv/bin/activate
alembic upgrade head
python -c "from app.utils.seed import run_seed; from app.database import SessionLocal; db = SessionLocal(); run_seed(db); db.close()"

echo "Database reset complete."
