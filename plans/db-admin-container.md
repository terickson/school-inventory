# Plan: SQLite Database Admin Container

## Goal

Add a lightweight container to `docker-compose.yml` that mounts the same SQLite data volume, giving admins a shell with `sqlite3` CLI and common DB utilities for ad-hoc queries, maintenance, and debugging.

## Design

### Container: `db-admin`

- **Base image:** `alpine:latest` — minimal footprint (~7MB)
- **Installed tools:**
  - `sqlite3` — CLI for querying/modifying the database
  - `bash` — more comfortable shell than ash
  - `less` — for paging query output
- **Volume:** Mounts the same `sqlite_data` volume at `/data` (same path as the backend)
- **Entrypoint:** `tail -f /dev/null` — keeps the container running without doing anything, so you can `docker compose exec` into it at any time
- **No ports exposed** — this is a shell-only admin tool, not a service

### Usage

```bash
# Exec into the container
docker compose exec db-admin bash

# Open the database
sqlite3 /data/school_inventory.db

# Example queries
.tables
.schema users
SELECT * FROM users;
SELECT * FROM checkouts WHERE status = 'overdue';
PRAGMA integrity_check;
.quit
```

### Changes Required

1. **docker-compose.yml** — Add the `db-admin` service:

```yaml
  db-admin:
    image: alpine:latest
    command: tail -f /dev/null
    volumes:
      - sqlite_data:/data
    entrypoint: /bin/sh -c "apk add --no-cache sqlite bash less && exec tail -f /dev/null"
```

2. **README.md** — Add a "Database Administration" section documenting the container and common sqlite3 commands.

3. **CLAUDE.md** — Add `docker compose exec db-admin bash` to the key commands section.

### Safety Considerations

- The container shares the same volume as the backend, so writes are live against production data — document this clearly
- SQLite WAL mode means reads won't block the backend, but writes could cause `SQLITE_BUSY` if the backend is also writing
- Recommend using `BEGIN IMMEDIATE` for any manual write transactions to fail fast rather than wait
- Consider adding a read-only reminder in the container's bash prompt (e.g., `PS1="[db-admin (LIVE DATA)] $ "`)

### No Tests Needed

This is an infrastructure-only change — no application code is modified.
