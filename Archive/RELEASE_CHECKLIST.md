# Release Checklist für v1.0.0

## Pre-Release

### Code & Dokumentation

- [x] Alle Bugs gefixt (Transparenz, i18n, Light-Mode, .deb Icons)
- [x] CHANGELOG.md erstellt mit allen Features
- [x] CONTRIBUTING.md erstellt
- [x] README.md aktualisiert
- [ ] Screenshots erstellt und in `screenshots/` Ordner abgelegt
  - [ ] `main.png` - Hauptansicht
  - [ ] `settings.png` - Einstellungen-Dialog
  - [ ] `minty.png` - Minty close-up mit Sprechblase
  - [ ] `transparency.png` - Transparenz-Demo
  - [ ] `dark-light.png` - Dark/Light Mode Vergleich
- [ ] LICENSE Datei vorhanden (MIT)
- [ ] GitHub Repository erstellt
- [ ] Repository auf GitHub gepusht

### Build & Test

- [ ] TypeScript Build erfolgreich: `npm run build`
  ```bash
  cd ultrawide-dashboard
  npm run build
  ```
- [ ] Frontend Build ohne Fehler
- [ ] Backend Build ohne Fehler
- [ ] Dev-Mode funktioniert: `npm run dev`
- [ ] Packaging erfolgreich: `npm run package:linux`
  ```bash
  npm run package:linux
  ```
- [ ] .deb Paket erstellt: `release/minty-dashboard_1.0.0_amd64.deb`
- [ ] AppImage erstellt: `release/Minty-Dashboard-1.0.0.AppImage`
- [ ] .deb Icon-Verifikation: `./scripts/verify-deb-icons.sh`
  - Icons sollten in `/usr/share/icons/hicolor/16x16/`, `32x32/`, etc. sein (NICHT `0x0`)
  - .desktop file sollte `Icon=minty-dashboard` haben

### Manuelle Tests

#### .deb Paket testen

```bash
# Installieren
sudo dpkg -i release/minty-dashboard_1.0.0_amd64.deb

# Starten aus Menü oder:
minty-dashboard

# Tests durchführen:
# 1. App startet ohne Fehler
# 2. Icon wird korrekt im App-Menü angezeigt
# 3. Transparenz-Toggle funktioniert (ON/OFF)
# 4. Theme-Wechsel (Hell/Dunkel) funktioniert
# 5. Sprach-Wechsel funktioniert (DE → EN → ES → SR)
# 6. Minty zeigt lokalisierte Kommentare
# 7. Browser Console: window.testTransparency() → alle Tests bestanden

# Deinstallieren nach Test
sudo dpkg -r minty-dashboard
```

#### AppImage testen

```bash
chmod +x release/Minty-Dashboard-1.0.0.AppImage
./release/Minty-Dashboard-1.0.0.AppImage

# Gleiche Tests wie bei .deb
```

### Transparenz-Tests (KRITISCH)

Im Browser DevTools Console:

```javascript
// Transparenz OFF testen
// 1. Settings → General → Transparenz-Toggle OFF
window.testTransparency()
// Erwartung: "--transparency-enabled: 0", Widget bg alpha = 1

// Transparenz ON testen
// 2. Settings → General → Transparenz-Toggle ON
// 3. Hintergrund-Slider auf 50%
// 4. Widget-Slider auf 70%
window.testTransparency()
// Erwartung: "--transparency-enabled: 1", alpha < 1, Desktop sichtbar
```

### Light-Mode Tests (KRITISCH)

```
1. Settings → General → "Hell" klicken
   ✓ Button bleibt sichtbar (blauer Hintergrund)
2. Settings → Kalender → "Montag" sichtbar
   ✓ Button ist sichtbar und klickbar
3. Settings → Sprache → alle Buttons sichtbar
   ✓ Alle Sprach-Buttons haben sichtbare Borders
```

### i18n Tests

```
1. Settings → Sprache → Deutsch
   Top-Bar zeigt: "Tech-Geschichte", "Linux-Tipp", etc.
2. Settings → Sprache → English
   Top-Bar zeigt: "Tech History", "Linux Tip", etc.
3. Settings → Sprache → Español
   Top-Bar zeigt: "Historia Tech", "Consejo Linux", etc.
4. Settings → Sprache → Srpski
   Top-Bar zeigt: "Tech Istorija", "Linux Savet", etc.
   Nikola Tesla Eintrag erscheint bei 10. Juli
```

## GitHub Release

### Repository Setup

- [ ] Repository auf GitHub erstellt
- [ ] README.md mit korrekter GitHub-URL aktualisiert
- [ ] CHANGELOG.md URLs aktualisiert
- [ ] .github/RELEASE_TEMPLATE.md URLs aktualisiert
- [ ] Screenshots in `screenshots/` committed
- [ ] Code gepusht: `git push origin main`

### Release erstellen

1. [ ] Gehe zu: https://github.com/YOUR_USERNAME/ultrawide-dashboard/releases/new
2. [ ] Tag: `v1.0.0` (als neues Tag erstellen)
3. [ ] Release Title: `Minty Dashboard v1.0.0 - Initial Release`
4. [ ] Beschreibung: Kopiere aus `.github/RELEASE_TEMPLATE.md`
5. [ ] Assets hochladen:
   - [ ] `minty-dashboard_1.0.0_amd64.deb`
   - [ ] `Minty-Dashboard-1.0.0.AppImage`
6. [ ] "Set as latest release" aktiviert
7. [ ] "Publish release" klicken

### Nach dem Release

- [ ] Release-Link in README.md aktualisieren
- [ ] Social Media Announcement (optional):
  - [ ] Reddit: r/linuxmint, r/linux
  - [ ] LinkedIn
  - [ ] Mastodon/Twitter
- [ ] Flathub/AUR Packaging vorbereiten (optional, später)

## Troubleshooting

### Build-Fehler

```bash
# TypeScript Fehler beheben
cd frontend
npm run build

# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
```

### Icon-Fehler in .deb

```bash
# Prüfen ob Icons richtig sind
./scripts/verify-deb-icons.sh

# Falls 0x0 → Icon-Permissions prüfen
ls -la electron/icons/
# Sollten alle 644 (-rw-r--r--) sein

# Neu bauen
npm run package:linux
```

### Transparenz funktioniert nicht

```bash
# Electron Window-Level checken
# In electron/main.js sollte KEINE setBackgroundColor NACH return sein

# CSS checken
# In frontend/src/index.css sollte KEIN globales button-override sein

# Runtime-Test
window.testTransparency()
```

## Versionen für zukünftige Releases

### v1.0.1 (Bugfix)
- Kleinere Bugfixes
- Keine neuen Features
- Nur Patch-Version erhöhen

### v1.1.0 (Minor)
- Neue Features (Widgets, etc.)
- Keine Breaking Changes
- Minor-Version erhöhen

### v2.0.0 (Major)
- Breaking Changes
- Große Architektur-Änderungen
- Major-Version erhöhen

---

**Letzte Prüfung vor Release:**
```bash
npm run build && npm run package:linux && ./scripts/verify-deb-icons.sh
```

Alle Tests bestanden? ✅ → **GO FOR RELEASE!** 🚀
