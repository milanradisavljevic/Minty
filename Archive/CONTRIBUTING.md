# Contributing zu Minty Dashboard

Vielen Dank für dein Interesse, zu Minty Dashboard beizutragen! 🌿

## 🚀 Schnellstart

1. **Fork** das Repository
2. **Clone** deinen Fork: `git clone https://github.com/YOUR_USERNAME/ultrawide-dashboard`
3. **Setup** das Projekt:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```
4. **Erstelle einen Branch**: `git checkout -b feature/mein-feature`
5. **Mache deine Änderungen**
6. **Teste** lokal: `npm run dev`
7. **Commit**: `git commit -m "feat: Beschreibung"`
8. **Push**: `git push origin feature/mein-feature`
9. **Pull Request** erstellen

## 📋 Issue Guidelines

### Bug Reports

Bitte füge folgende Informationen hinzu:

- **Beschreibung**: Was ist passiert?
- **Erwartetes Verhalten**: Was sollte passieren?
- **Schritte zur Reproduktion**:
  1. Schritt 1
  2. Schritt 2
  3. ...
- **System-Info**:
  - OS: (z.B. Linux Mint 21.3)
  - Desktop: (z.B. Cinnamon 5.8)
  - Node Version: `node --version`
  - App Version: (z.B. 1.0.0)
- **Screenshots** (falls relevant)
- **Log-Dateien**: `~/.config/Minty Dashboard/logs/`

### Feature Requests

- **Use Case**: Warum brauchst du dieses Feature?
- **Beschreibung**: Was soll das Feature tun?
- **Alternativen**: Gibt es andere Lösungen?
- **Mockups/Screenshots** (optional)

## 💻 Code Guidelines

### Code Style

- **TypeScript**: Nutze TypeScript für alle neuen Dateien
- **ESLint**: Führe `npm run lint` vor dem Commit aus
- **Formatting**: Nutze konsistente Einrückung (2 Spaces)
- **Naming**:
  - Komponenten: `PascalCase` (z.B. `WeatherWidget.tsx`)
  - Funktionen: `camelCase` (z.B. `fetchWeatherData`)
  - Konstanten: `UPPER_SNAKE_CASE` (z.B. `API_BASE_URL`)

### Commit Messages

Nutze [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add weather forecast widget
fix: Fix transparency toggle not working
docs: Update README installation section
style: Format code with prettier
refactor: Extract metrics logic to service
test: Add tests for transparency system
chore: Update dependencies
```

### Testing

- **Manuelle Tests**: Teste deine Änderungen in Dev-Mode (`npm run dev`)
- **Build-Test**: Stelle sicher, dass `npm run build` funktioniert
- **Package-Test**: Teste das .deb/.AppImage wenn möglich

## 🌍 Übersetzungen

Wir freuen uns über Übersetzungen in weitere Sprachen!

### Neue Sprache hinzufügen

1. Kopiere `frontend/src/i18n/locales/en.json`
2. Benenne es nach deinem Sprachcode (z.B. `fr.json` für Französisch)
3. Übersetze alle Strings
4. Füge die Sprache in `frontend/src/i18n.ts` hinzu:
   ```typescript
   import fr from './locales/fr.json';
   // ...
   resources: { ..., fr: { translation: fr } }
   ```
5. Füge die Sprache in `frontend/src/stores/settingsStore.ts` zum `Language` Type hinzu
6. Teste alle Screens in der neuen Sprache

### Bestehende Übersetzung verbessern

- Editiere die entsprechende JSON-Datei in `frontend/src/i18n/locales/`
- Achte darauf, dass alle Keys vorhanden bleiben
- Teste die Änderungen in der App

## 🎨 UI/UX Guidelines

- **Minty Theme**: Nutze die vordefinierten CSS-Variablen (`--color-*`)
- **Responsivität**: Teste verschiedene Bildschirmgrößen
- **Dark/Light Mode**: Stelle sicher, dass beide Modi funktionieren
- **Transparenz**: Teste mit aktivierter und deaktivierter Transparenz
- **Accessibility**: Nutze semantisches HTML und ARIA-Labels

## 📦 Widget hinzufügen

1. **Komponente erstellen**: `frontend/src/components/widgets/MeinWidget.tsx`
   ```tsx
   export function MeinWidget() {
     return (
       <div className="p-4 bg-[var(--color-widget-bg)] rounded-lg">
         {/* Widget content */}
       </div>
     );
   }
   ```

2. **Widget registrieren**: In `frontend/src/stores/settingsStore.ts`
   ```typescript
   widgets: [
     // ...
     { id: 'mein-widget', enabled: false, position: { x: 0, y: 0, w: 2, h: 2 } }
   ]
   ```

3. **Dashboard Integration**: In `frontend/src/components/Dashboard.tsx`

4. **i18n Strings**: Füge Übersetzungen in allen Sprach-Dateien hinzu

5. **Dokumentation**: Update README mit neuem Widget

## 🔍 Code Review

Pull Requests werden nach folgenden Kriterien geprüft:

- ✅ Code Quality und Style
- ✅ Funktionalität (funktioniert wie beschrieben?)
- ✅ Breaking Changes (werden vermieden?)
- ✅ Dokumentation (README/Comments aktualisiert?)
- ✅ Tests (wurde manuell getestet?)

## 📄 Lizenz

Mit deinem Beitrag stimmst du zu, dass dein Code unter der MIT-Lizenz veröffentlicht wird.

## 🙏 Fragen?

Fühle dich frei, ein Issue zu erstellen oder in den Discussions zu fragen!

Vielen Dank für deinen Beitrag! 🎉
