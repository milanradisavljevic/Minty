import { useState, useEffect } from 'react';
import { WidgetWrapper } from './WidgetWrapper';

interface RandomArticle {
  id: string;
  title: string;
  extract: string;
  url: string;
  thumbnail?: string;
  timestamp: number;
}

type Source = 'wikipedia-de' | 'wikipedia-en';

const SOURCE_CONFIG: Record<Source, { label: string; icon: string; apiUrl: string; baseUrl: string }> = {
  'wikipedia-de': {
    label: 'Wikipedia DE',
    icon: '🇩🇪',
    apiUrl: 'https://de.wikipedia.org/api/rest_v1/page/random/summary',
    baseUrl: 'https://de.wikipedia.org/wiki/',
  },
  'wikipedia-en': {
    label: 'Wikipedia EN',
    icon: '🇬🇧',
    apiUrl: 'https://en.wikipedia.org/api/rest_v1/page/random/summary',
    baseUrl: 'https://en.wikipedia.org/wiki/',
  },
};

export function RabbitHoleWidget() {
  const [currentArticle, setCurrentArticle] = useState<RandomArticle | null>(null);
  const [history, setHistory] = useState<RandomArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('wikipedia-de');
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rabbitHoleHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RandomArticle[];
        setHistory(parsed.slice(0, 10));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('rabbitHoleHistory', JSON.stringify(history.slice(0, 10)));
    }
  }, [history]);

  const fetchRandomArticle = async () => {
    setLoading(true);
    setError(null);

    try {
      const config = SOURCE_CONFIG[source];
      const response = await fetch(config.apiUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }

      const data = await response.json();

      const article: RandomArticle = {
        id: data.pageid?.toString() || Date.now().toString(),
        title: data.title || 'Unbekannt',
        extract: data.extract || data.description || 'Keine Beschreibung verfügbar.',
        url: data.content_urls?.desktop?.page || `${config.baseUrl}${encodeURIComponent(data.title)}`,
        thumbnail: data.thumbnail?.source,
        timestamp: Date.now(),
      };

      setCurrentArticle(article);

      // Add to history (avoid duplicates)
      setHistory((prev) => {
        const filtered = prev.filter((a) => a.id !== article.id);
        return [article, ...filtered].slice(0, 10);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (article: RandomArticle) => {
    setCurrentArticle(article);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('rabbitHoleHistory');
    setShowHistory(false);
  };

  return (
    <WidgetWrapper titleKey="widget_rabbitHole" noPadding>
      <div className="h-full flex flex-col">
        {/* Header with source selector */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-[var(--color-widget-border)]">
          <div className="flex items-center gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSource(key as Source)}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                  source === key
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span>{config.icon}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showHistory
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
            title="History"
          >
            📚 {history.length}
          </button>
        </div>

        {/* History view */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">
                Keine History vorhanden
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => loadFromHistory(article)}
                    className="w-full text-left p-2 rounded-lg bg-[var(--color-widget-border)]/50 hover:bg-[var(--color-widget-border)] transition-colors"
                  >
                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {article.title}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                      {new Date(article.timestamp).toLocaleString('de-DE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </button>
                ))}
                <button
                  onClick={clearHistory}
                  className="w-full text-xs text-[var(--color-error)] hover:underline mt-2"
                >
                  History löschen
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Main content area */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {!currentArticle && !loading && !error && (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
                  <span className="text-4xl mb-2">🐰</span>
                  <span className="text-xs">Klicke auf den Button um in den Rabbit Hole zu springen!</span>
                </div>
              )}

              {loading && (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-error)]">
                  <span className="text-2xl mb-2">⚠️</span>
                  <span className="text-xs">{error}</span>
                </div>
              )}

              {currentArticle && !loading && (
                <div className="space-y-3">
                  {/* Thumbnail */}
                  {currentArticle.thumbnail && (
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-[var(--color-widget-border)]">
                      <img
                        src={currentArticle.thumbnail}
                        alt={currentArticle.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {currentArticle.title}
                  </h3>

                  {/* Extract */}
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-4">
                    {currentArticle.extract}
                  </p>

                  {/* Link */}
                  <a
                    href={currentArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Mehr lesen →
                  </a>
                </div>
              )}
            </div>

            {/* Rabbit Hole Button */}
            <div className="px-3 pb-3">
              <button
                onClick={fetchRandomArticle}
                disabled={loading}
                className={`
                  w-full py-3 rounded-lg font-medium text-sm transition-all duration-200
                  ${
                    loading
                      ? 'bg-[var(--color-widget-border)] text-[var(--color-text-secondary)] cursor-wait'
                      : 'bg-gradient-to-r from-[var(--color-accent)] to-purple-500 text-white hover:opacity-90 shadow-lg hover:shadow-[var(--color-accent)]/25'
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🐰</span>
                    Suche...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🕳️ In den Rabbit Hole springen
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </WidgetWrapper>
  );
}
