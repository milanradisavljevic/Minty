import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuotesStore } from '../stores/quotesStore';
import { getLocale, useTranslation } from '../i18n';
import type { Quote } from '../types';

const STALE_THRESHOLD = 20 * 60 * 1000;
const MIN_REFRESH_MINUTES = 5;
const DEFAULT_REFRESH_MINUTES = 10;

function formatPrice(quote: Quote, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: quote.currency || 'USD',
      maximumFractionDigits: 2,
    }).format(quote.price);
  } catch {
    return `${quote.price.toFixed(2)} ${quote.currency}`;
  }
}

function formatChange(quote: Quote) {
  if (quote.changePct === undefined || quote.changePct === null) return '—';
  const pct = quote.changePct;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

function isStaleQuote(quote: Quote) {
  const now = Date.now();
  return quote.isStale || now - quote.marketTime > STALE_THRESHOLD || now - quote.lastUpdated > STALE_THRESHOLD;
}

export function TopTickerBar() {
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  const quotes = useQuotesStore((state) => state.quotes);
  const symbols = useQuotesStore((state) => state.symbols);
  const refreshIntervalMinutes = useQuotesStore((state) => state.refreshIntervalMinutes);
  const setQuotes = useQuotesStore((state) => state.setQuotes);
  const setSettings = useQuotesStore((state) => state.setSettings);
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastActiveRef = useRef(false);
  const pollTimer = useRef<number | null>(null);

  const refreshMinutes = Math.max(
    MIN_REFRESH_MINUTES,
    refreshIntervalMinutes || DEFAULT_REFRESH_MINUTES
  );

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settingsRes = await fetch('/api/quotes/settings');
        if (!cancelled && settingsRes.ok) {
          const data = await settingsRes.json();
          if (data?.settings) {
            setSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to load quotes settings', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSettingsLoaded(true);
        }
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  useEffect(() => {
    if (!settingsLoaded) return;
    let cancelled = false;
    const controller = new AbortController();

    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/quotes', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.quotes)) {
          setQuotes(data.quotes as Quote[]);
          toastActiveRef.current = false;
          setError(null);
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error('Failed to load quotes', error);
        setError(t('stocks_error'));
        toastActiveRef.current = true;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const schedulePoll = () => {
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
      }
      pollTimer.current = window.setTimeout(() => {
        fetchQuotes().catch((err) => console.error('Quote poll failed', err));
        schedulePoll();
      }, refreshMinutes * 60_000);
    };

    fetchQuotes();
    schedulePoll();

    return () => {
      cancelled = true;
      controller.abort();
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshMinutes, setQuotes, settingsLoaded, symbols, t]);

  const orderedQuotes = useMemo(() => {
    if (!symbols.length) return quotes;
    const map = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));
    const fromSymbols = symbols
      .map((symbol) => map.get(symbol.toUpperCase()))
      .filter(Boolean) as Quote[];
    const extras = quotes.filter((q) => !symbols.includes(q.symbol));
    return [...fromSymbols, ...extras];
  }, [quotes, symbols]);

  return (
    <div className="h-10 px-4 flex items-center gap-3 overflow-x-auto bg-[var(--color-dashboard-bg)]/80 border-b border-[var(--color-widget-border)]/70 backdrop-blur-md text-[var(--color-text-secondary)]">
      {orderedQuotes.length === 0 ? (
        <span className="text-xs">
          {loading ? t('loading_config') : error || t('stocks_empty_watchlist')}
        </span>
      ) : (
        orderedQuotes.map((quote) => {
          const stale = isStaleQuote(quote);
          const change = formatChange(quote);
          const price = formatPrice(quote, locale);
          const tooltipLines = [
            quote.displayName || quote.symbol,
            `${price} ${change}`,
            `Zeitpunkt: ${new Date(quote.marketTime).toLocaleString(locale)}`,
            `Quelle: ${quote.source}`,
            `Währung: ${quote.currency}`,
          ];

          return (
            <div
              key={quote.symbol}
              className={`flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--color-widget-border)]/80 bg-[var(--color-widget-bg)]/70 text-xs whitespace-nowrap shadow-sm ${
                stale ? 'opacity-70' : ''
              }`}
              title={tooltipLines.join(' • ')}
            >
              <span className="font-semibold text-[var(--color-text-primary)]">{quote.symbol}</span>
              <span className="text-[var(--color-text-primary)]">{price}</span>
              <span
                className={`font-semibold ${
                  quote.changePct === undefined || quote.changePct === null
                    ? 'text-[var(--color-text-secondary)]'
                    : quote.changePct >= 0
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-error)]'
                }`}
              >
                {change}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  stale ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]/70'
                }`}
                title={stale ? 'Veraltet' : 'Live'}
              />
            </div>
          );
        })
      )}

      <div className="text-[10px] text-[var(--color-text-secondary)] ml-auto">
        Refresh: {refreshMinutes}m
      </div>
    </div>
  );
}
