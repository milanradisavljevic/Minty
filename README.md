# Minty Dashboard

A personal dashboard for ultrawide displays (tested at 5120x1440) with live widgets and the Minty system companion.

## Highlights
- Minty companion with breathing/blinking animations, time-of-day mood, and multi-language quips.
- Live system metrics (CPU, RAM, disk, network) with sparklines.
- News wall (4 feeds), weather, tasks/calendar, Pomodoro timer.
- Ambient sounds (rain, forest, fireplace, ocean, etc.).
- Optional stock ticker (backend + frontend flags).
- Transparency mode with separate background and widget alpha controls, plus blur.

## Requirements
- Node.js 18+
- npm

## Installation
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Development
```bash
# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev

# Electron shell (backend on 3002 to avoid conflicts)
npm run dev:electron
```
Frontend dev server: http://localhost:5173  
Backend dev server: http://localhost:3001 (or 3002 for dev:electron)

## Production build
```bash
npm run build          # builds frontend + backend
npm run start          # runs backend/dist/index.js
```

## Packaging (Electron)
- `npm run package` or `npm run package:linux` builds frontend/backend and rebuilds `better-sqlite3` against the installed Electron version.
- Packaged backend runs via Electron’s embedded Node (`ELECTRON_RUN_AS_NODE=1`), so no system Node.js is needed at runtime.
- If you see a `NODE_MODULE_VERSION` mismatch after switching Node versions, run `npm run rebuild:native` then re-run the package script.

## Tests
```bash
cd backend && npm run test
```

## Configuration
- Stocks watchlist: `backend/src/stocks/stockService.ts` (when enabled)
- News feeds: `backend/src/services/newsService.ts`

## Environment variables
- `PORT`: backend port (default `3001`)
- `STOCKS_ENABLED`: enable stocks in backend (`true`/`1`), default `false`
- `VITE_STOCKS_ENABLED`: enable stocks in frontend (`true`/`1`), default `false`
- `STOCKS_DEBUG`: verbose stock fetching logs (`1` or `true`)
- `STOCKS_ALLOW_FALLBACK`: allow fallback stock data (`1` or `true`)

## Troubleshooting
- Yahoo Finance rate limits: increase the update interval (120s+ recommended).
- Wrong ticker: include the exchange suffix (e.g., `SAP.DE`).
- No data: check network; enable `STOCKS_DEBUG=1` for backend logs.

## Tech stack
- Frontend: Vite, React, TypeScript, Tailwind, Zustand
- Backend: Node.js, Express, Socket.io
- Data/APIs: yahoo-finance2, rss-parser, systeminformation

## Project layout
```
ultrawide-dashboard/
├── frontend/    # React frontend
├── backend/     # Express backend
└── shared/      # Shared TypeScript types
```

## Credits
- Minty character design: custom SVG inspired by Linux Mint.
- Concept art: generated for initial design reference.
