#!/bin/bash
# Ultrawide Dashboard - Production Start Script
# Serves built frontend via backend (no Vite dev server)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PORT=3001
BACKEND_PID=""

log() {
    echo -e "${GREEN}[Dashboard]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[Dashboard]${NC} $1"
}

error() {
    echo -e "${RED}[Dashboard]${NC} $1"
}

cleanup() {
    log "Shutting down..."
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    log "Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

log "Starting Ultrawide Dashboard (Production Mode)..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    log "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    log "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Build everything
log "Building application..."
npm run build

# Check if frontend build exists
if [ ! -d "frontend/dist" ]; then
    error "Frontend build failed - dist folder not found"
    exit 1
fi

# Start backend with auto-restart
log "Starting server on port $PORT..."
cd backend
./run-backend.sh &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
log "Waiting for server to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
        log "Server is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    error "Server failed to start after ${MAX_ATTEMPTS}s"
    cleanup
    exit 1
fi

# Open browser
log "Opening browser..."
URL="http://localhost:$PORT"

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "$URL" &
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Ultrawide Dashboard (Production)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  Dashboard: ${BLUE}http://localhost:$PORT${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop"
echo ""

# Wait for backend
wait $BACKEND_PID
