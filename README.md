# Ultrawide Dashboard

Persönliches Dashboard für Super-Ultrawide-Monitore (5120x1440) mit Live-Widgets und **Minty**, dem lebendigen System-Maskottchen! 🌿

## Features

- **Minty - System Pet:** Interaktives Minzblatt-Maskottchen mit Persönlichkeit
  - Blinzelt, atmet und reagiert auf System-Status
  - Tageszeit-abhängige Stimmung (müde nachts, wach tagsüber)
  - Mehrsprachige Smalltalk-Sprüche (DE/EN Mix)
  - Easter Eggs (13:37 = "LEET.", Freitag-Sprüche, etc.)
  - Ambient-Reaktionen (Kamin-Glow, Regentropfen)
  - Responsive Skalierung (3 Größenstufen)
  - Klick für neuen Spruch
- **Stock Ticker:** Live-Preise von Yahoo Finance, korrekter Regular-Market-Preis, Cache-Guardrails, Last-Updated-Anzeige
- **News Reader:** 4 Spalten (Heise, Golem, HN, Yahoo Finance)
- **System-Metriken:** CPU, RAM, Disk, Netzwerk mit Sparklines
- **Pomodoro Timer:** 25/5 Minuten mit Session-Tracking
- **Ambient Sounds:** Regen, Wald, Kamin, Ozean, etc.
- **Timeline:** Tagesverlauf mit "Jetzt"-Marker
- **Uhr:** Digitale Uhr mit deutschem Datumsformat
- **Wetter:** Lokale Wettervorhersage
- **Tasks & Kalender:** Todo-Liste und Terminübersicht

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

- Watchlist: `backend/src/stocks/stockService.ts`
- RSS Feeds: `backend/src/services/newsService.ts`

## Environment Variablen

- `PORT`: Backend-Port (default `3001`)
- `STOCKS_ENABLED`: Stocks Feature-Flag (`true`/`1`), default `false`
- `VITE_STOCKS_ENABLED`: Frontend Feature-Flag (`true`/`1`), default `false`
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

## Minty - Das System Pet 🌿

Minty ist ein freundliches Minzblatt mit Circuit-Board-Pattern, das auf dein System reagiert:

### Animationen
- **Atmen:** Sanfte Breathing-Animation (scale 1.0 → 1.05)
- **Blinzeln:** Alle 3-7 Sekunden, manchmal doppelt
- **Tageszeit-Stimmung:** Augen passen sich der Uhrzeit an
  - 🌅 Morgens (5-9h): Müde, halb geschlossene Augen
  - ☀️ Vormittags (9-12h): Wach und fröhlich
  - 🌆 Abends (17-20h): Entspannt
  - 🌙 Nachts (23-5h): Sehr müde

### Interaktionen
- **Klick auf Minty:** Zeigt neuen zufälligen Spruch
- **Sprechblasen:** Wechseln automatisch jede Minute
- **System-Reaktionen:**
  - High CPU (>80%): Angestrengter Gesichtsausdruck
  - High RAM (>85%): Besorgter Ausdruck
  - High Temp (>70°): Schwitzend mit Hitzewellen

### Smalltalk-Kategorien (DE/EN Mix)
- **Linux-Stolz:** "I use Mint, BTW.", "Free as in freedom. And beer."
- **Arch-Roasts:** "BTW, I actually work.", "I don't use Arch. I have a life."
- **Windows/Mac:** "Windows Update? Don't know her.", "Ctrl+Alt+Del? I prefer Ctrl+C."
- **Tageszeit:** "Coffee... need coffee...", "Night shift gang.", "3 AM thoughts hit different."
- **Easter Eggs:** 13:37 → "LEET.", Freitag → "Zeit für... genau das gleiche wie immer."

### Ambient-Reaktionen
- **🔥 Kamin aktiv:** Warmer orange Glow-Effekt
- **🌧️ Regen aktiv:** Regentropfen-Animation + blaue Tönung

### Responsive Skalierung
- **Small (80px):** Widget < 250px Breite
- **Medium (120px):** Widget 250-400px
- **Large (176px):** Widget > 400px

## Layout

```
┌──────────────────────────────────────────────────────────┐
│                    Stock Ticker Bar                       │
├────────┬──────────┬──────────────────────┬───────────────┤
│  Uhr   │  Minty   │        News          │   Kalender    │
│        │ (Pet)    │    (4 Spalten)       │    Tasks      │
│        │  System  │                      │               │
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

## Credits

- **Minty Character Design:** Custom SVG, inspired by Linux Mint mascot
- **Concept Art:** Generated for initial design reference
- **Voice:** Multilingual smartass with a heart of green 🌿

## Backlog

- Layout-Presets fuer verschiedene Bildschirmaufloesungen
- Flatpak/Flathub Packaging
- Minty Settings Toggle (Smalltalk ein/aus, Animationen ein/aus)
