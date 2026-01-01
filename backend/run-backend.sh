#!/bin/bash
# Backend wrapper script with auto-restart capability
# Exit code 0 = restart requested, exit code != 0 = error/shutdown

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Dashboard Backend]${NC} Starting backend service..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[Dashboard Backend]${NC} Installing dependencies..."
    npm install
fi

# Check if built
if [ ! -f "dist/backend/src/index.js" ]; then
    echo -e "${YELLOW}[Dashboard Backend]${NC} Building TypeScript..."
    npm run build
fi

# Run backend in a loop (restart on exit code 0)
while true; do
    echo -e "${GREEN}[Dashboard Backend]${NC} Starting server..."
    node dist/backend/src/index.js
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${YELLOW}[Dashboard Backend]${NC} Restart requested, restarting in 1 second..."
        sleep 1
    else
        echo -e "${RED}[Dashboard Backend]${NC} Server exited with code $EXIT_CODE"
        echo -e "${RED}[Dashboard Backend]${NC} Waiting 3 seconds before restart..."
        sleep 3
    fi
done
