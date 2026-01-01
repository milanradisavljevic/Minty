# Dashboard Screenshot erstellen

## Manuell (empfohlen)

1. Öffne das Dashboard: http://localhost:3000
2. Drücke `Print` oder `PrtScn` 
3. Oder: Screenshot-Tool deiner Wahl

## Mit Tool

```bash
# Gnome Screenshot (Window)
gnome-screenshot -w -f dashboard-demo.png

# Spectacle (KDE)
spectacle -w -o dashboard-demo.png

# ImageMagick (klick auf Fenster)
import dashboard-demo.png

# Firefox Headless (wenn kein Firefox läuft)
firefox --screenshot dashboard-demo.png --window-size=1920,1080 http://localhost:3000
```

## Beispiel Screenshot

Der Screenshot sollte zeigen:
- Minty mit Sprechblase
- System-Metriken (CPU/RAM/Temp Bars)
- Verschiedene Widgets
- Ultrawide Layout
