#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Use SQLite for native development
export USE_SQLITE=true
export DEBUG=true

pids=()

start_backend() {
  echo "[backend] Starting Django dev server on ${BACKEND_PORT}..."
  (
    cd "$ROOT_DIR/backend"
    if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
      "$ROOT_DIR/.venv/bin/python" manage.py runserver "0.0.0.0:${BACKEND_PORT}"
    elif [ -f "$ROOT_DIR/backend/venv/bin/python" ]; then
      "$ROOT_DIR/backend/venv/bin/python" manage.py runserver "0.0.0.0:${BACKEND_PORT}"
    else
      python3 manage.py runserver "0.0.0.0:${BACKEND_PORT}"
    fi
  ) &
  pids+=($!)
}

start_frontend() {
  echo "[frontend] Starting Vite dev server on ${FRONTEND_PORT}..."
  (
    cd "$ROOT_DIR/frontend"
    npm run dev -- --host --port "${FRONTEND_PORT}"
  ) &
  pids+=($!)
}

cleanup() {
  echo "\nShutting down services..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait
}

trap cleanup EXIT INT TERM

echo "Starting TextVerity Platform (Native - No Docker)..."
echo "Database: SQLite"
echo ""

start_backend
sleep 2
start_frontend

echo ""
echo "All services running!"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Admin:    http://localhost:${BACKEND_PORT}/admin"
echo ""
echo "Press Ctrl+C to stop all services."
wait -n
