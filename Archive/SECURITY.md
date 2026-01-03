# Security Checklist

## Geprüft am: 2026-01-02

### ✅ Abgeschlossen

- [x] Keine hardcoded API Keys im Code
- [x] .env in .gitignore
- [x] npm audit zeigt keine kritischen Production Issues
  - Frontend: 0 vulnerabilities
  - Backend: 0 vulnerabilities
- [x] User-Inputs werden validiert
  - Tasks: Title required, trimmed
  - Notes: Content required, trimmed
  - SQLite prepared statements (SQL injection safe)
- [x] CORS korrekt konfiguriert
  - Nur localhost:3000 und 127.0.0.1:3000 erlaubt
- [x] React XSS-Schutz
  - Kein dangerouslySetInnerHTML verwendet
  - React escaped automatisch alle User-Inputs

### 🔧 Empfehlungen für v1.1

- [ ] String-Längen-Limits hinzufügen (max 1000 chars für Tasks/Notes)
- [ ] Rate-Limiting für API-Endpoints
- [ ] Content Security Policy Headers
- [ ] Electron Security Best Practices (bei Electron-Integration):
  - nodeIntegration: false
  - contextIsolation: true
  - sandbox: true

## Bekannte Einschränkungen

### Akzeptabel für v1.0
- **Kein Rate-Limiting:** Akzeptabel für lokale Nutzung (localhost only)
- **Keine String-Längen-Limits:** SQLite kann große Strings speichern, aber könnte UI langsam machen bei sehr großen Notes
- **CORS nur localhost:** Intentional - Dashboard ist für lokale Nutzung gedacht

### Nicht für Production-Internet-Deployment
Dieses Dashboard ist **ausschließlich für lokale Nutzung** gedacht. Nicht auf einem öffentlichen Server deployen ohne:
- Authentication/Authorization
- HTTPS/TLS
- Rate Limiting
- Input Sanitization mit strengeren Regeln
- CSP Headers

## Sicherheits-Best-Practices für User

1. **API Keys:** Niemals API Keys in den Code committen - immer `.env` verwenden
2. **Updates:** Regelmäßig `npm audit` laufen lassen und Dependencies updaten
3. **Netzwerk:** Dashboard nur auf localhost binden (nicht 0.0.0.0)
4. **Backups:** SQLite-DB regelmäßig sichern (enthält Tasks/Notes)

## Meldung von Sicherheitslücken

Bitte sende Sicherheitslücken an: [GitHub Issues](https://github.com/yourusername/minty-dashboard/issues) (oder privat per E-Mail falls kritisch)
