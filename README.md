# Ultrawide Dashboard

Persönliches Dashboard für Super-Ultrawide-Monitore (5120x1440) mit Live-Widgets.

## Features

- **Stock Ticker:** Live-Preise von Yahoo Finance, korrekter Regular-Market-Preis, Cache-Guardrails, Last-Updated-Anzeige
- **News Reader:** 4 Spalten (Heise, Golem, HN, Yahoo Finance)
- **System-Metriken:** CPU, RAM, Disk, Netzwerk mit Sparklines
- **Timeline:** Tagesverlauf mit "Jetzt"-Marker
- **Uhr:** Digitale Uhr mit deutschem Datumsformat

## Setup

Voraussetzungen: Node.js 18+.

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Dev-Start

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Dann: **http://localhost:3000**

### Build/Run

```bash
npm run build
npm run start
```

### Tests

```bash
cd backend && npm run test
```

## Konfiguration

- Watchlist: `backend/src/services/stockService.ts`
- RSS Feeds: `backend/src/services/newsService.ts`

## Environment Variablen

- `PORT`: Backend-Port (default `3001`)
- `STOCKS_DEBUG`: Debug-Logging fuer Stock-Fetching (`1` oder `true`)
- `STOCKS_ALLOW_FALLBACK`: Optionales Fallback fuer Stock-Preise (`1` oder `true`)

## Troubleshooting

- **Rate Limits bei Yahoo Finance:** Update-Intervall in den Settings erhoehen (Empfehlung: 120s+).
- **Falscher Ticker:** Symbol mit Exchange-Suffix verwenden (z.B. `SAP.DE`).
- **Keine Daten:** Netzwerkverbindung pruefen; Backend-Logs mit `STOCKS_DEBUG=1` aktivieren.

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + Zustand
- **Backend:** Node.js + Express + Socket.io
- **APIs:** yahoo-finance2, rss-parser, systeminformation

## Layout

```
┌──────────────────────────────────────────────────────────┐
│                    Stock Ticker Bar                       │
├────────┬──────────┬──────────────────────┬───────────────┤
│  Uhr   │  System  │        News          │   Kalender    │
│        │ Metriken │    (4 Spalten)       │    Tasks      │
├────────┴──────────┴──────────────────────┴───────────────┤
│                     Timeline Bar                          │
└──────────────────────────────────────────────────────────┘
```

## Verzeichnisstruktur

```
ultrawide-dashboard/
├── frontend/          # React Frontend
├── backend/           # Express Backend
└── shared/            # Gemeinsame TypeScript Types
```

## Backlog

- Layout-Presets fuer verschiedene Bildschirmaufloesungen
- Flatpak/Flathub Packaging
