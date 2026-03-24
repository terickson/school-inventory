#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

cleanup() {
  echo ""
  echo "Cleaning up..."
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_service() {
  local url=$1
  local name=$2
  local max_retries=${3:-30}
  for ((i=1; i<=max_retries; i++)); do
    if curl -s "$url" > /dev/null 2>&1; then
      echo "  $name is ready."
      return 0
    fi
    sleep 1
  done
  echo "  ERROR: $name did not start within ${max_retries}s"
  return 1
}

# --- Reset database ---
echo "==> Resetting database..."
"${SCRIPT_DIR}/reset_db.sh"
mkdir -p "${BACKEND_DIR}/uploads"

# --- Kill any existing servers on our ports ---
echo "==> Stopping existing servers..."
for port in $BACKEND_PORT $FRONTEND_PORT; do
  pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K\d+' || true)
  if [[ -n "$pid" ]]; then
    echo "  Killing process $pid on port $port"
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
done

# --- Start backend ---
echo "==> Starting backend on port ${BACKEND_PORT}..."
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --port "$BACKEND_PORT" > /tmp/e2e-backend.log 2>&1 &
BACKEND_PID=$!
wait_for_service "http://localhost:${BACKEND_PORT}/health" "Backend"

# --- Start frontend ---
echo "==> Starting frontend on port ${FRONTEND_PORT}..."
cd "$FRONTEND_DIR"
npx vite --port "$FRONTEND_PORT" > /tmp/e2e-frontend.log 2>&1 &
FRONTEND_PID=$!
wait_for_service "http://localhost:${FRONTEND_PORT}" "Frontend"

# --- Run E2E tests ---
echo "==> Running E2E tests..."
echo ""
cd "$PROJECT_DIR"
npx jest --config jest.config.ts --runInBand "$@"
