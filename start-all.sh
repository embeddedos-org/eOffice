#!/bin/bash
# eOffice Suite — Start All Services
# Usage: ./start-all.sh [--server-only] [--no-server]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
export JWT_SECRET="${JWT_SECRET:-eoffice-dev-secret-key-change-in-production-2024}"
export EMAIL_ENCRYPTION_KEY="${EMAIL_ENCRYPTION_KEY:-eoffice-email-encryption-key-32chars!}"
export EAI_BASE_URL="${EAI_BASE_URL:-http://localhost:8420}"
export PORT="${PORT:-3001}"

PIDS=()

cleanup() {
  echo ""
  echo "Shutting down eOffice..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait
  echo "All services stopped."
}

trap cleanup EXIT INT TERM

echo "========================================="
echo "  eOffice Suite — Starting All Services"
echo "========================================="
echo ""

# Start server
if [ "$1" != "--no-server" ]; then
  echo "[1/2] Starting eOffice Server on port $PORT..."
  cd packages/server
  npx tsx watch src/index.ts &
  PIDS+=($!)
  cd "$SCRIPT_DIR"
  sleep 2
  echo "  ✓ Server started (PID: ${PIDS[-1]})"
fi

# Start all app dev servers
if [ "$1" != "--server-only" ]; then
  echo "[2/2] Starting app dev servers..."

  APPS=(
    "launcher:5170"
    "edocs:5173"
    "enotes:5174"
    "esheets:5175"
    "eslides:5176"
    "email:5177"
    "edb:5178"
    "edrive:5179"
    "econnect:5180"
    "eforms:5181"
    "esway:5182"
    "eplanner:5183"
  )

  for entry in "${APPS[@]}"; do
    APP_NAME="${entry%%:*}"
    APP_PORT="${entry##*:}"
    echo "  Starting $APP_NAME on port $APP_PORT..."
    cd "apps/$APP_NAME"
    VITE_API_URL="http://localhost:$PORT" npx vite --port "$APP_PORT" --host &
    PIDS+=($!)
    cd "$SCRIPT_DIR"
  done

  echo ""
  echo "========================================="
  echo "  All services started!"
  echo "========================================="
  echo ""
  echo "  Server:     http://localhost:$PORT/api/health"
  echo "  Launcher:   http://localhost:5170"
  echo "  eDocs:      http://localhost:5173"
  echo "  eNotes:     http://localhost:5174"
  echo "  eSheets:    http://localhost:5175"
  echo "  eSlides:    http://localhost:5176"
  echo "  Email:      http://localhost:5177"
  echo "  eDB:        http://localhost:5178"
  echo "  eDrive:     http://localhost:5179"
  echo "  eConnect:   http://localhost:5180"
  echo "  eForms:     http://localhost:5181"
  echo "  eSway:      http://localhost:5182"
  echo "  ePlanner:   http://localhost:5183"
  echo ""
  echo "Press Ctrl+C to stop all services."
fi

# Wait for all background processes
wait
