#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

pids=()

start_databases() {
  echo "[databases] Starting PostgreSQL and Redis..."
  cd "$ROOT_DIR/docker"
  docker-compose up -d db redis
  
  echo "[databases] Waiting for PostgreSQL to be ready..."
  for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
      echo "[databases] PostgreSQL is ready!"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "[databases] Error: PostgreSQL failed to start"
      exit 1
    fi
    sleep 1
  done
}

start_backend() {
  echo "[backend] Starting Django dev server on ${BACKEND_PORT}..."
  (
    cd "$ROOT_DIR/backend"
    "$ROOT_DIR/.venv/bin/python" manage.py runserver "0.0.0.0:${BACKEND_PORT}"
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

start_databases
start_backend
start_frontend

echo "All services running. Press Ctrl+C to stop."
wait -n
