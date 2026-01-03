import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved transparency as early as possible (before React mounts)
try {
  const raw = localStorage.getItem('dashboard-settings')
  if (raw) {
    const parsed = JSON.parse(raw)
    const appearance = parsed?.state?.appearance
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
    const transparencyEnabled = appearance?.transparencyEnabled !== false
    const bgOpacity = transparencyEnabled
      ? clamp01((appearance?.backgroundOpacity ?? 100) / 100)
      : 1
    const widgetOpacity = transparencyEnabled
      ? clamp01((appearance?.widgetOpacity ?? 100) / 100)
      : 1
    const root = document.documentElement
    root.style.setProperty('--transparency-enabled', transparencyEnabled ? '1' : '0')
    root.style.setProperty('--bg-opacity', bgOpacity.toString())
    root.style.setProperty('--widget-opacity', widgetOpacity.toString())

    // Set body/html background: opaque when OFF, transparent when ON
    const bgColor = transparencyEnabled ? 'transparent' : 'var(--color-dashboard-bg)'
    document.body.style.backgroundColor = bgColor
    root.style.backgroundColor = bgColor
  }
} catch (err) {
  console.warn('Could not pre-apply transparency settings', err)
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'white', background: '#1a1a1a', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>Fehler beim Laden</h1>
          <pre style={{ color: '#fca5a5', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ color: '#888', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              localStorage.removeItem('dashboard-settings');
              window.location.reload();
            }}
            style={{ marginTop: 20, padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            LocalStorage leeren und neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
