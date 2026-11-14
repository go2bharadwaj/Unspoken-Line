#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

# 1. Environment variable template replication
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
  echo "Copying backend/.env.example -> backend/.env"
  cp "backend/.env.example" "backend/.env"
fi

if [ ! -f "frontend/.env" ] && [ -f "frontend/.env.example" ]; then
  echo "Copying frontend/.env.example -> frontend/.env"
  cp "frontend/.env.example" "frontend/.env"
fi

# 2. Python backend virtual environment setup
if [ ! -d "backend/.venv" ]; then
  echo "Setting up Python virtual environment in backend/.venv..."
  python3 -m venv "backend/.venv"
  "backend/.venv/bin/pip" install --upgrade pip
  "backend/.venv/bin/pip" install -r "backend/requirements-dev.txt"
fi

# 3. Frontend dependency installation if directory exists
if [ -d "frontend" ] && [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

# 4. Clean process termination handling
BACKEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down development servers..."
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup EXIT INT TERM

# 5. Launch FastAPI backend on :8000
echo "Starting FastAPI backend on http://localhost:8000..."
(cd backend && exec .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# 6. Launch Vite frontend or wait on backend
if [ -d "frontend" ]; then
  echo "Starting Vite frontend on http://localhost:5173..."
  (cd frontend && npm run dev)
else
  echo "Frontend directory not present; running backend standalone (PID: ${BACKEND_PID})."
  wait "${BACKEND_PID}"
fi
