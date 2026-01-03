# Minty Dashboard

Minty Dashboard is a desktop dashboard for ultrawide displays (tested at 5120×1440) with live widgets, transparency, and the Minty companion.

## What’s new in 1.1
- Layout profiles (compact / standard / ultrawide) with scaling and per-profile layouts.
- Clamped row heights so widgets do not balloon when only a few are enabled.
- Real transparency controls (background + widget alpha) with a global toggle.
- Memento Mori footer placement refinements and centered layout.
- Icon unified to `minty-icon.png` for packaged builds (.AppImage and .deb).

## Features
- Minty companion with breathing/blinking animations, time-of-day mood, and multi-language quips.
- System metrics (CPU, RAM, disk, network) with sparklines.
- News wall (multiple feeds), weather, tasks/calendar, Pomodoro timer.
- Ambient sounds (rain, forest, fireplace, ocean, wind, etc.).
- Optional stock ticker (backend + frontend flags).
- Transparency mode with separate background and widget opacity plus blur.

## Requirements
- Node.js 18+ (build); packaged app ships with its own runtime.
- npm

## Install dependencies
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Development
```bash
# Terminal 1: backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2: frontend (http://localhost:5173)
cd frontend && npm run dev

# Electron shell (backend on 3002 to avoid port clash)
npm run dev:electron
```

## Production build
```bash
npm run build          # builds frontend + backend
npm run start          # runs backend/dist/index.js
```

## Packaging (Linux)
```bash
npm run package:linux
```
Outputs go to `release/`:
- `Minty Dashboard-<version>.AppImage`
- `minty-dashboard_<version>_amd64.deb`

Notes:
- The packaging script rebuilds `better-sqlite3` against the bundled Electron. If you change Node versions and hit `NODE_MODULE_VERSION` errors, run `npm run rebuild:native` then re-run the package.
- Icons come from `frontend/public/icons/minty-icon.png` and are copied into `electron/icons/`.

## Configuration
- Stocks: `backend/src/stocks/stockService.ts` (backend) and `VITE_STOCKS_ENABLED` (frontend) control visibility.
- News feeds: `backend/src/services/newsService.ts`.
- Settings (transparency, layout profiles, widget toggles) persist locally.

### Environment variables
- `PORT`: backend port (default `3001`)
- `STOCKS_ENABLED`: enable stocks in backend (`true`/`1`), default `false`
- `VITE_STOCKS_ENABLED`: enable stocks in frontend (`true`/`1`), default `false`
- `STOCKS_DEBUG`: verbose stock logs (`1` or `true`)
- `STOCKS_ALLOW_FALLBACK`: allow fallback stock data (`1` or `true`)

## Troubleshooting
- Stock data rate limits: increase update interval (120s+ recommended).
- Ticker lookup: include exchange suffix (e.g., `SAP.DE`).
- Module version mismatch during packaging: run `npm run rebuild:native`.

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
