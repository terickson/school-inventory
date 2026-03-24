#!/usr/bin/env bash
#
# nightly-backup.sh — Nightly SQLite backup with 7-day retention
#
# Creates a consistent backup of the school_inventory database from
# the Docker volume, then deletes backups older than 7 days.
#
# Designed to run via cron:
#   0 2 * * * /opt/apps/school-inventory/scripts/nightly-backup.sh
#
# Exit codes:
#   0 — backup completed successfully
#   1 — backup failed (ntfy notification sent if configured)
#
set -euo pipefail

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
INSTALL_DIR="/opt/apps/school-inventory"
BACKUP_DIR="/opt/apps/school-inventory-backups"
VOLUME_NAME="school-inventory_sqlite_data"
DB_NAME="school_inventory.db"
RETENTION_DAYS=7

# ntfy topic — populated by rpi-setup.sh, empty = no notifications
NTFY_TOPIC=""

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME%.db}_${TIMESTAMP}.db"
LOG_TAG="school-inventory-backup"

log()  { logger -t "$LOG_TAG" "$*"; echo "[backup] $*"; }
err()  { logger -t "$LOG_TAG" -p user.err "$*"; echo "[backup] ERROR: $*" >&2; }

notify_failure() {
    local message="$1"
    if [[ -n "$NTFY_TOPIC" ]]; then
        curl -s \
            -H "Title: Backup failed on $(hostname)" \
            -H "Tags: warning" \
            -H "Priority: high" \
            -d "$message" \
            "https://ntfy.sh/$NTFY_TOPIC" || true
    fi
}

# ──────────────────────────────────────────────
# Backup
# ──────────────────────────────────────────────
do_backup() {
    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"

    log "Starting backup to ${BACKUP_FILE}..."

    # Run sqlite3 inside a temporary container with the data volume mounted.
    # The .backup command uses the SQLite backup API, which is safe to run
    # while the database is in use (it handles WAL correctly).
    if ! docker run --rm \
        -v "${VOLUME_NAME}:/data:ro" \
        -v "${BACKUP_DIR}:/backups" \
        alpine:latest \
        sh -c "apk add --no-cache sqlite > /dev/null 2>&1 && sqlite3 /data/${DB_NAME} \".backup '/backups/${DB_NAME%.db}_${TIMESTAMP}.db'\""; then
        err "sqlite3 .backup failed"
        notify_failure "sqlite3 .backup command failed. Check 'docker volume ls' and ensure the app is deployed."
        exit 1
    fi

    # Verify the backup is not empty
    if [[ ! -s "$BACKUP_FILE" ]]; then
        err "Backup file is empty: ${BACKUP_FILE}"
        rm -f "$BACKUP_FILE"
        notify_failure "Backup file was empty — deleted. The database volume may be missing."
        exit 1
    fi

    local size
    size=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup complete: ${BACKUP_FILE} (${size})"
}

# ──────────────────────────────────────────────
# Retention
# ──────────────────────────────────────────────
prune_old_backups() {
    log "Pruning backups older than ${RETENTION_DAYS} days..."

    local count
    count=$(find "$BACKUP_DIR" -name "school_inventory_*.db" -mtime +"$RETENTION_DAYS" | wc -l)

    if [[ "$count" -gt 0 ]]; then
        find "$BACKUP_DIR" -name "school_inventory_*.db" -mtime +"$RETENTION_DAYS" -delete
        log "Deleted ${count} old backup(s)."
    else
        log "No backups to prune."
    fi
}

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
main() {
    do_backup
    prune_old_backups
    log "Nightly backup finished successfully."
}

main
