#!/bin/bash
# Ultrawide Dashboard - One-Click Start Script
# Starts backend and opens frontend in browser

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_PORT=3001
FRONTEND_PORT=3000
BACKEND_PID=""
FRONTEND_PID=""

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
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
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

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    warn "Node.js version $NODE_VERSION detected. Version 18+ recommended."
fi

log "Starting Ultrawide Dashboard..."

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing root dependencies..."
    npm install
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    log "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    log "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Build backend if needed
if [ ! -f "backend/dist/index.js" ]; then
    log "Building backend..."
    cd backend && npm run build && cd ..
fi

# Start backend with auto-restart wrapper
log "Starting backend on port $BACKEND_PORT..."
cd backend
./run-backend.sh &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
log "Waiting for backend to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
        log "Backend is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    error "Backend failed to start after ${MAX_ATTEMPTS}s"
    cleanup
    exit 1
fi

# Start frontend dev server
log "Starting frontend on port $FRONTEND_PORT..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
log "Waiting for frontend to be ready..."
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        log "Frontend is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

# Open browser
log "Opening browser..."
URL="http://localhost:$FRONTEND_PORT"

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "$URL" &
elif command -v firefox &> /dev/null; then
    firefox "$URL" 2>/dev/null &
else
    warn "Could not open browser automatically. Please open: $URL"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Ultrawide Dashboard is running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  Frontend: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop"
echo ""

# Wait for processes
wait
