import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
