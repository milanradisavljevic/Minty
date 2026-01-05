# Minty Dashboard

Minty Dashboard is a desktop dashboard for ultrawide displays (tested at 5120×1440) with live widgets, transparency, and the Minty companion.

## What's new in 1.1.1 (January 2026)

### Stock Ticker Integration - FULLY FUNCTIONAL ✅
- **Fixed duplicate function definitions** in `quotesService.ts` that were causing incorrect API behavior
- **Updated yahoo-finance2 integration** for v3.x API (now requires `new YahooFinance()` instantiation)
- **Multi-source fallback chain**:
  1. **Alpha Vantage** (primary for stocks) - working with free tier key
  2. **Yahoo Finance** (fallback) - handles 429 rate limits gracefully
  3. **CoinGecko** (crypto fallback) - BTC-USD, ETH-USD support
- **Improved error handling**: 429 rate limit errors are silently handled instead of spamming logs
- **Default symbols**: AAPL, MSFT, BTC-USD, ETH-USD (configurable in Settings)
- **Refresh interval**: 10 minutes (configurable, minimum 5 minutes)
- **Display**: Live top ticker bar shows symbol, price, and % change with color coding

### Weather Service - RESILIENT WITH FALLBACK ✅
- **Dual-source weather system**:
  1. **Open-Meteo** (primary) - free tier with 10k requests/day
  2. **wttr.in** (fallback) - no API key required, unlimited requests
- **Stale cache fallback**: Returns cached data up to 24 hours old if all services fail
- **Error detection**: Properly detects and handles API rate limiting
- **Weather code mapping**: WMO codes from wttr.in mapped to Open-Meteo format for consistency
- **Auto-recovery**: Switches back to primary source when available

### Bug Fixes
- Fixed `better-sqlite3` module version mismatch for Node.js v22
- Fixed TypeScript errors in `Dashboard.tsx` with react-grid-layout types
- Fixed frontend build process to work with updated dependencies
- Suppressed Yahoo Finance survey notice to reduce log noise

### Technical Improvements
- Added comprehensive error handling for all external API calls
- Implemented sequential stock fetching to reduce rate-limit hits
- Enhanced caching mechanisms for both stocks and weather
- Better logging with contextual warnings vs errors

## What's new in 1.1
- Layout profiles (compact / standard / ultrawide) with scaling and per-profile layouts.
- Clamped row heights so widgets do not balloon when only a few are enabled.
- Real transparency controls (background + widget alpha) with a global toggle.
- Icon unified to `minty-icon.png` for packaged builds (.AppImage and .deb).

## Features
- Minty companion with breathing/blinking animations, time-of-day mood, and multi-language quips.
- System metrics (CPU, RAM, disk, network) with sparklines.
- News wall (multiple feeds), weather, tasks/calendar, Pomodoro timer.
- Ambient sounds (rain, forest, fireplace, ocean, wind, etc.).
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

## Stocks Ticker (Top Bar)
- **Source priority**: Alpha Vantage (primary) → Yahoo Finance → CoinGecko (crypto only fallback)
- **Default Alpha key** (dev/demo): `WXZCURA1RM9VXFIW`. Override via env `ALPHA_VANTAGE_API_KEY` or Settings → Stocks tab (API key field). Saved in backend settings.
- **Configure symbols** and refresh interval in Settings → Stocks (comma-separated symbols like `AAPL, MSFT, SAP.DE, ^GSPC, BTC-USD`). Default refresh: 10 minutes. Shows current price + day % change.
- **Backend endpoints**: `/api/quotes`, `/api/quotes/settings`, `/api/quotes/default`; WebSocket event: `quotes:update`. Scheduler refreshes on the configured interval. Sequential fetch to reduce rate-limit hits; Alpha "Note" responses trigger fallback.
- **Rate limiting**: Alpha Vantage free tier has 25 requests/day limit. Yahoo Finance may return 429 errors - falls back gracefully. CoinGecko used for crypto when other sources fail.

## Weather Widget
- **Dual-source system**: Open-Meteo (primary) → wttr.in (fallback) → stale cache (up to 24 hours)
- **Open-Meteo**: Free tier with 10,000 requests/day, no API key required
- **wttr.in**: Unlimited requests, no API key, WMO weather codes mapped to Open-Meteo format
- **Configuration**: Set latitude/longitude in backend config (default: Vienna, Austria - 48.2082, 16.3738)
- **Update interval**: 10 minutes (configurable via `weather.updateInterval` in config)
- **Caching**: Minimum 30-minute TTL, returns stale data if all sources fail to prevent widget errors
- **Backend endpoint**: `/api/weather`

## Layout Presets
- Persisted in SQLite table `layout_presets` with per-screenKey separation (`<width>x<height>@dpr<value>-<orientation>`).
- API: `/api/layouts` (list/create/update/delete/set-default).
- UI: Dashboard header “Layouts” controls — “Speichern als” saves current layout; Overwrite/Standard/Delete also reload the list so new presets appear immediately.
- Stored format: raw React-Grid layout array (older `{ layout: [...] }` still parsed on load).

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
- Stocks: `backend/src/services/quotesService.ts` (backend) und `VITE_STOCKS_ENABLED` (frontend) steuern die Sichtbarkeit.
- News feeds: `backend/src/services/newsService.ts`.
- Settings (transparency, layout profiles, widget toggles) persist locally.

### Environment variables
- `PORT`: backend port (default `3001`)
- `STOCKS_ENABLED`: enable stocks in backend (`true`/`1`), default `false`
- `VITE_STOCKS_ENABLED`: enable stocks in frontend (`true`/`1`), default `false`
- `STOCKS_DEBUG`: verbose stock logs (`1` or `true`)
- `STOCKS_ALLOW_FALLBACK`: allow fallback stock data (`1` or `true`)

## Troubleshooting

### Stock Ticker Issues
- **Rate limits**: Alpha Vantage free tier allows 25 requests/day. If hitting limits, increase update interval to 60+ minutes or use your own API key.
- **Missing symbols**: Some symbols may be missing from the ticker due to rate limiting. The system will retry on the next refresh cycle.
- **Yahoo Finance 429 errors**: Normal behavior when rate-limited. System automatically falls back to Alpha Vantage or CoinGecko.
- **Ticker lookup**: Include exchange suffix for non-US stocks (e.g., `SAP.DE` for Frankfurt, `.L` for London, `.PA` for Paris).
- **Crypto prices**: Use format like `BTC-USD`, `ETH-USD` for cryptocurrencies.

### Weather Widget Issues
- **"Failed to fetch weather" error**: Open-Meteo may be rate-limited. System automatically falls back to wttr.in.
- **Stale weather data**: If all services fail, displays cached data with warning. Data updates when services recover.
- **Location not updating**: Check latitude/longitude in backend config file or restart backend after config changes.

### General Issues
- **Module version mismatch during packaging**: Run `npm run rebuild:native` to rebuild native modules for Electron.
- **Backend won't start - port in use**: Kill existing processes on port 3001: `lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill`
- **Frontend build errors**: Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

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
