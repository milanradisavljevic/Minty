# Minty Icons & Desktop Integration

## Icon-Dateien

Alle Icons befinden sich in `frontend/public/icons/`:

### SVG (skalierbar, bevorzugt)
- `minty-icon.svg` - Haupticon (2.7KB)
- `../favicon.svg` - Browser-Favicon (1.3KB)

### PNG (für Desktop)
- `minty-icon-256.png` - 256x256px (67KB) - **Empfohlen für Desktop**
- `minty-icon-128.png` - 128x128px (20KB)
- `minty-icon-64.png` - 64x64px (6.3KB)
- `minty-icon-48.png` - 48x48px (4.2KB)

## Desktop Entry

Eine `.desktop` Datei wurde erstellt: `ultrawide-dashboard.desktop`

### Installation als Desktop-Icon:

```bash
# Kopiere in lokale Anwendungen
cp ultrawide-dashboard.desktop ~/.local/share/applications/

# Oder auf den Desktop
cp ultrawide-dashboard.desktop ~/Desktop/
chmod +x ~/Desktop/ultrawide-dashboard.desktop
```

### Manuelle .desktop Datei:

```desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=Ultrawide Dashboard
Comment=Personal Dashboard with Minty
Exec=/pfad/zum/start-dashboard.sh
Icon=/pfad/zum/minty-icon-256.png
Terminal=false
Categories=Utility;Monitor;
```

## Autostart (Linux Mint/Cinnamon)

```bash
# Kopiere in Autostart
cp ultrawide-dashboard.desktop ~/.config/autostart/
```

## Icon für Firefox Kiosk Mode

Die Icons sind bereits in `index.html` eingebunden:
- Browser-Tab: `favicon.svg`
- Touch-Icon: `minty-icon.svg`
- Theme-Color: `#22c55e` (Minty-Grün)
