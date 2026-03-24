#!/usr/bin/env bash
#
# deploy.sh — Install or update School Supply Inventory from GitHub zip
#
# Usage:
#   Initial install:  sudo ./deploy.sh
#   Update:           sudo ./deploy.sh
#   Custom branch:    sudo ./deploy.sh --branch develop
#   Skip backup:      sudo ./deploy.sh --no-backup
#
set -euo pipefail

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
REPO="terickson/school-inventory"
BRANCH="main"
INSTALL_DIR="/opt/apps/school-inventory"
BACKUP_DIR="/opt/apps/school-inventory-backups"
ENV_FILE="${INSTALL_DIR}/.env"
SKIP_BACKUP=false

# ──────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --branch)   BRANCH="$2"; shift 2 ;;
        --no-backup) SKIP_BACKUP=true; shift ;;
        --help)
            echo "Usage: $0 [--branch BRANCH] [--no-backup]"
            echo ""
            echo "  --branch BRANCH   GitHub branch to download (default: main)"
            echo "  --no-backup       Skip database backup before update"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
log()  { echo -e "\033[1;34m[deploy]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }
err()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; }
fail() { err "$@"; exit 1; }

check_deps() {
    for cmd in curl unzip docker; do
        command -v "$cmd" &>/dev/null || fail "'$cmd' is required but not installed."
    done
    docker compose version &>/dev/null || fail "'docker compose' plugin is required."
}

# ──────────────────────────────────────────────
# Detect install vs update
# ──────────────────────────────────────────────
is_update() {
    [[ -f "${INSTALL_DIR}/docker-compose.yml" ]]
}

# ──────────────────────────────────────────────
# Backup database (update only)
# ──────────────────────────────────────────────
backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warn "Skipping database backup (--no-backup)."
        return
    fi

    log "Backing up database..."
    mkdir -p "$BACKUP_DIR"

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/school_inventory_${timestamp}.db"

    # Check if the backend container is running — use its backup API if possible
    if docker compose -f "${INSTALL_DIR}/docker-compose.yml" ps --format '{{.Service}}' 2>/dev/null | grep -q backend; then
        log "Backend is running — using SQLite backup API for a consistent snapshot..."

        # Copy DB from the named volume via a temp container
        docker run --rm \
            -v school-inventory_sqlite_data:/data \
            -v "${BACKUP_DIR}:/backup" \
            alpine:latest \
            sh -c "cp /data/school_inventory.db /backup/school_inventory_${timestamp}.db 2>/dev/null || true"

        # Also try to checkpoint WAL first via the running backend
        docker compose -f "${INSTALL_DIR}/docker-compose.yml" exec -T backend \
            python -c "
from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
db.execute(text('PRAGMA wal_checkpoint(TRUNCATE)'))
db.close()
" 2>/dev/null || true

        # Re-copy after checkpoint
        docker run --rm \
            -v school-inventory_sqlite_data:/data \
            -v "${BACKUP_DIR}:/backup" \
            alpine:latest \
            sh -c "cp /data/school_inventory.db /backup/school_inventory_${timestamp}.db 2>/dev/null || true"
    else
        # Backend not running — copy directly from volume
        docker run --rm \
            -v school-inventory_sqlite_data:/data \
            -v "${BACKUP_DIR}:/backup" \
            alpine:latest \
            sh -c "cp /data/school_inventory.db /backup/school_inventory_${timestamp}.db 2>/dev/null || true"
    fi

    if [[ -f "$backup_file" ]]; then
        local size
        size=$(du -h "$backup_file" | cut -f1)
        log "Backup saved: ${backup_file} (${size})"
    else
        warn "No existing database found — skipping backup (this is normal for first install)."
    fi
}

# ──────────────────────────────────────────────
# Preserve .env across updates
# ──────────────────────────────────────────────
preserve_env() {
    if [[ -f "$ENV_FILE" ]]; then
        log "Preserving existing .env file..."
        cp "$ENV_FILE" /tmp/school-inventory-env-backup
    fi
}

restore_env() {
    if [[ -f /tmp/school-inventory-env-backup ]]; then
        log "Restoring .env file..."
        cp /tmp/school-inventory-env-backup "$ENV_FILE"
        rm -f /tmp/school-inventory-env-backup
    fi
}

# ──────────────────────────────────────────────
# Download and extract
# ──────────────────────────────────────────────
download_and_extract() {
    local zip_url="https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip"
    local tmp_zip="/tmp/school-inventory-${BRANCH}.zip"
    local tmp_extract="/tmp/school-inventory-extract"

    log "Downloading ${REPO}@${BRANCH}..."
    curl -fsSL "$zip_url" -o "$tmp_zip" || fail "Failed to download from ${zip_url}"

    log "Extracting..."
    rm -rf "$tmp_extract"
    mkdir -p "$tmp_extract"
    unzip -qo "$tmp_zip" -d "$tmp_extract"

    # GitHub zips extract to a folder like "school-inventory-main/"
    local extracted_dir
    extracted_dir=$(find "$tmp_extract" -mindepth 1 -maxdepth 1 -type d | head -1)
    [[ -d "$extracted_dir" ]] || fail "Extraction failed — no directory found."

    # Create install dir if needed
    mkdir -p "$INSTALL_DIR"

    # Sync files (preserves nothing in INSTALL_DIR that isn't in the zip)
    log "Deploying to ${INSTALL_DIR}..."
    rsync -rlptD --delete \
        --exclude='.env' \
        --exclude='*.db' \
        --exclude='*.db-wal' \
        --exclude='*.db-shm' \
        "${extracted_dir}/" "${INSTALL_DIR}/"

    # Cleanup
    rm -rf "$tmp_zip" "$tmp_extract"
}

# ──────────────────────────────────────────────
# Create default .env on first install
# ──────────────────────────────────────────────
create_default_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log "Creating default .env file..."
        local secret_key
        secret_key=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)

        cat > "$ENV_FILE" <<ENVEOF
# School Supply Inventory — Production Configuration
# Generated on $(date -Iseconds)

SECRET_KEY=${secret_key}
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@school.edu
ADMIN_PASSWORD=AdminPass123!
ENVEOF

        warn "Default .env created at ${ENV_FILE}"
        warn "IMPORTANT: Change ADMIN_PASSWORD and SECRET_KEY before exposing to users!"
    fi
}

# ──────────────────────────────────────────────
# Stop running containers (update only)
# ──────────────────────────────────────────────
stop_services() {
    if docker compose -f "${INSTALL_DIR}/docker-compose.yml" ps -q 2>/dev/null | grep -q .; then
        log "Stopping running services..."
        docker compose -f "${INSTALL_DIR}/docker-compose.yml" down --timeout 30
    fi
}

# ──────────────────────────────────────────────
# Build and start
# ──────────────────────────────────────────────
start_services() {
    log "Building and starting services..."
    cd "$INSTALL_DIR"
    docker compose build --no-cache
    docker compose up -d

    log "Waiting for backend health check..."
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null | grep -q "backend.*healthy"; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if [[ $retries -eq 0 ]]; then
        warn "Backend health check timed out — check logs with: docker compose -f ${INSTALL_DIR}/docker-compose.yml logs backend"
    else
        log "Backend is healthy."
    fi
}

# ──────────────────────────────────────────────
# Print summary
# ──────────────────────────────────────────────
print_summary() {
    echo ""
    echo "════════════════════════════════════════════════"
    if is_update; then
        log "Update complete!"
    else
        log "Installation complete!"
    fi
    echo "════════════════════════════════════════════════"
    echo ""
    echo "  Frontend:  http://localhost:8080"
    echo "  API:       http://localhost:8000"
    echo "  API Docs:  http://localhost:8000/docs"
    echo "  Config:    ${ENV_FILE}"
    echo ""
    if [[ -d "$BACKUP_DIR" ]] && ls "$BACKUP_DIR"/*.db &>/dev/null; then
        echo "  Backups:   ${BACKUP_DIR}/"
    fi
    echo ""
    echo "  Manage:    cd ${INSTALL_DIR} && docker compose logs -f"
    echo "  Stop:      cd ${INSTALL_DIR} && docker compose down"
    echo "  DB Shell:  cd ${INSTALL_DIR} && docker compose --profile tools up -d db-admin"
    echo "             docker compose exec db-admin bash"
    echo ""
}

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
main() {
    check_deps

    if is_update; then
        log "Existing installation detected — running UPDATE."
        backup_database
        preserve_env
        stop_services
        download_and_extract
        restore_env
        start_services
    else
        log "No existing installation — running INITIAL INSTALL."
        download_and_extract
        create_default_env
        start_services
    fi

    print_summary
}

main
