# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [1.0.0] - 2026-01-03

### ✨ Hinzugefügt

- **Transparenz-System**: Vollständig konfigurierbares Transparenz-System
  - Separater Toggle für Ein/Aus
  - Hintergrund-Transparenz-Slider (0-100%)
  - Widget-Transparenz-Slider (0-100%)
  - Echte Alpha-Transparenz (Desktop-Wallpaper scheint durch)
  - Funktioniert unter X11 auf Linux Mint/Cinnamon
- **Multi-Language Support**: Vollständige Unterstützung für 4 Sprachen
  - Deutsch (Standard)
  - Englisch
  - Spanisch
  - Serbokroatisch
- **Minty System Pet**: Interaktives Maskottchen mit Persönlichkeit
  - Blinzelt, atmet, reagiert auf Systemstatus
  - Tageszeit-abhängige Stimmung
  - Mehrsprachige Kommentare
  - Easter Eggs (13:37, Freitags-Sprüche, etc.)
- **System-Metriken Widget**: Live-Überwachung
  - CPU-Auslastung pro Kern
  - RAM-Nutzung
  - Festplatten-Belegung
  - Netzwerk (Download/Upload)
  - System-Uptime
- **News Reader**: Multi-Source RSS-Feed
  - Konfigurierbare Quellen
  - Spalten-Layout (1-4 Spalten)
  - Reihenfolge anpassbar
  - Feed-Test-Funktion
- **Wetter-Widget**: Lokale Wettervorhersage
  - Open-Meteo API Integration
  - Standort konfigurierbar (Lat/Lon)
  - Celsius/Fahrenheit
  - "Gefühlt wie" Temperatur
- **Pomodoro Timer**: Produktivitäts-Timer
  - Konfigurierbare Zeiten
  - Session-Tracking
  - Minty-Kommentare während Sessions
- **Ambient Sounds Mixer**: 8 Sounds mischbar
  - Regen, Wald, Café, Kamin, Ozean, Wind, Gewitter, White Noise
  - Individuelle Lautstärke pro Sound
  - "Alle stoppen" Funktion
- **Rabbit Hole Widget**: Zufällige Wikipedia-Artikel
- **Tasks & Notizen Widget**: Schnelle TODO-Verwaltung
- **Kalender Widget**: Integration mit System-Kalender
- **Timeline Bar**: Visualisierung des Tagesverlaufs
- **Theme-System**: Hell/Dunkel Modi
- **Responsive Grid-Layout**: React-Grid-Layout mit Drag&Drop

### 🔧 Technisch

- Electron 28 für Desktop-Integration
- React 19 + Vite 7 Frontend
- Node.js Express Backend mit Socket.io
- Zustand für State Management
- Tailwind CSS 4 für Styling
- TypeScript durchgehend
- SQLite für lokale Datenspeicherung
- Packaging: .deb und AppImage für Linux

### 🐛 Bekannte Einschränkungen

- **Stocks Widget**: Deaktiviert (hinter Feature-Flag) wegen Yahoo Finance API-Problemen
- **Nur Linux**: Derzeit nur für Linux-Distributionen getestet
- **X11 empfohlen**: Beste Transparenz-Unterstützung unter X11 (Wayland experimentell)

### 📝 Dokumentation

- Vollständiges README mit Installation und Features
- Inline-Code Dokumentation
- Test-Utilities für Transparenz-System
- Build- und Packaging-Anleitungen

---

## [Unreleased]

### In Planung

- Flatpak/Flathub Packaging
- Layout-Presets für verschiedene Bildschirmauflösungen
- Minty Einstellungen (Smalltalk/Animationen toggle)
- Music Player Widget
- Weitere Sprachen

[1.0.0]: https://github.com/YOUR_USERNAME/ultrawide-dashboard/releases/tag/v1.0.0
