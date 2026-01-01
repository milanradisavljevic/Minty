import { useEffect, useMemo, useRef, useState } from 'react';
import type { StockQuote, StockQuotesResponse } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { getLocale, useTranslation } from '../i18n';

const MIN_REFRESH_MS = 15000;
const INITIAL_RETRY_MS = 5000;
const MAX_RETRY_MS = 60000;
const STOCKS_ENABLED =
  import.meta.env.VITE_STOCKS_ENABLED === '1' || import.meta.env.VITE_STOCKS_ENABLED === 'true';

type FetchReason = 'initial' | 'poll' | 'retry' | 'manual';

export function StockTickerBar() {
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  const watchlist = useSettingsStore((s) => s.stocks?.watchlist ?? []);
  const updateInterval = useSettingsStore((s) => s.stocks?.updateInterval ?? 120000);

  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{ fromCache?: boolean; stale?: boolean; source?: string }>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [lastAsOf, setLastAsOf] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchRef = useRef<(force?: boolean) => Promise<void>>(() => Promise.resolve());

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  const retryTimeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const lastGoodQuotesRef = useRef<StockQuote[]>([]);

  const symbolsParam = useMemo(() => (watchlist.length ? watchlist.join(',') : null), [watchlist]);

  useEffect(() => {
    let isMounted = true;

    const clearRetryTimeout = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    retryDelayRef.current = INITIAL_RETRY_MS;
    clearRetryTimeout();

    if (!STOCKS_ENABLED) {
      setQuotes([]);
      setStatus('ready');
      setError(null);
      setSourceInfo({});
      setLastUpdated(null);
      setLastAsOf(null);
      return () => {
        isMounted = false;
        clearRetryTimeout();
      };
    }

    function scheduleRetry() {
      clearRetryTimeout();
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_MS);
      retryTimeoutRef.current = window.setTimeout(() => {
        fetchQuotes('retry');
      }, delay);
    }

    async function fetchQuotes(reason: FetchReason, force = false) {
      if (!isMounted) return;

      if (reason === 'initial' || reason === 'manual' || (reason === 'retry' && lastGoodQuotesRef.current.length === 0)) {
        setStatus('loading');
        setError(null);
      }

      if (!watchlist.length) {
        setQuotes([]);
        lastGoodQuotesRef.current = [];
        setStatus('ready');
        setSourceInfo({});
        setLastUpdated(null);
        clearRetryTimeout();
        return;
      }

      try {
        const urlBase = symbolsParam ? `/api/stocks?symbols=${encodeURIComponent(symbolsParam)}` : '/api/stocks';
        const url = force ? `${urlBase}${urlBase.includes('?') ? '&' : '?'}force=true` : urlBase;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: StockQuotesResponse = await response.json();
        const receivedRaw = data.quotes || [];
        const deduped: StockQuote[] = [];
        const seenSymbols = new Set<string>();
        for (const quote of receivedRaw) {
          if (quote?.symbol && !seenSymbols.has(quote.symbol)) {
            seenSymbols.add(quote.symbol);
            deduped.push(quote);
          }
        }

        if (deduped.length === 0) {
          throw new Error(data.error || 'No quotes available');
        }

        if (!isMounted) return;

        setQuotes(deduped);
        lastGoodQuotesRef.current = deduped;
        setLastUpdated(data.timestamp ?? Date.now());
        const maxAsOf = deduped.reduce((max, q) => Math.max(max, q.asOf || 0), 0);
        setLastAsOf(maxAsOf || null);
        setSourceInfo({ fromCache: data.fromCache, stale: data.stale, source: data.source });
        setError(data.missing && data.missing.length > 0 ? data.error || `${data.missing.length} symbols missing` : data.error || null);
        setStatus('ready');
        retryDelayRef.current = INITIAL_RETRY_MS;
        clearRetryTimeout();

        if (data.error) {
          console.warn('Stocks endpoint warning:', data.error);
        }
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Stock ticker fetch failed:', message);
        setError(message);
        if (lastGoodQuotesRef.current.length > 0) {
          setQuotes(lastGoodQuotesRef.current);
          setStatus('ready');
        } else {
          setQuotes([]);
          setStatus('error');
        }
        scheduleRetry();
      }
    }

    fetchQuotes('initial');
    const intervalMs = Math.max(MIN_REFRESH_MS, updateInterval);
    const intervalId = window.setInterval(() => fetchQuotes('poll'), intervalMs);

    fetchRef.current = (force = false) => fetchQuotes('manual', force);

    return () => {
      isMounted = false;
      clearRetryTimeout();
      clearInterval(intervalId);
    };
  }, [symbolsParam, updateInterval, watchlist.length]);

  // Auto-scroll animation
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || quotes.length === 0) return;

    const scrollSpeed = 0.5; // pixels per frame

    function animate() {
      if (!container || isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      scrollPositionRef.current += scrollSpeed;

      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      if (scrollPositionRef.current >= maxScroll) {
        scrollPositionRef.current = 0;
      }

      container.scrollLeft = scrollPositionRef.current;
      animationRef.current = requestAnimationFrame(animate);
    }

    // Start animation after a short delay
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [quotes, isPaused]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchRef.current(true);
    setIsRefreshing(false);
  };

  const formatPrice = (price: number, currency: string) => {
    // Handle special currencies
    const currencyCode = currency === 'GBp' ? 'GBP' : currency;
    const adjustedPrice = currency === 'GBp' ? price / 100 : price;

    // Use appropriate symbol
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '\u20AC',
      GBP: '\u00A3',
      JPY: '\u00A5',
      CHF: 'CHF ',
    };

    const symbol = symbols[currencyCode] || `${currencyCode} `;
    return `${symbol}${adjustedPrice.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getChangeColor = (percent: number) => {
    if (percent > 0) return 'text-[var(--color-success)]';
    if (percent < 0) return 'text-[var(--color-error)]';
    return 'text-[var(--color-text-secondary)]';
  };

  const getChangeBgColor = (percent: number) => {
    if (percent > 0) return 'bg-[var(--color-success)]/10';
    if (percent < 0) return 'bg-[var(--color-error)]/10';
    return 'bg-[var(--color-widget-border)]';
  };

  // Shorten company name for display
  const shortenName = (name: string, maxLength = 15): string => {
    if (name.length <= maxLength) return name;
    const shortened = name.substring(0, maxLength);
    const lastSpace = shortened.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      return shortened.substring(0, lastSpace) + '...';
    }
    return shortened + '...';
  };

  const nextRetrySeconds = Math.round(retryDelayRef.current / 1000);
  const watchlistEmpty = watchlist.length === 0;
  const lastUpdatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleTimeString(locale) : null;
  const asOfLabel = lastAsOf ? new Date(lastAsOf).toLocaleTimeString(locale) : null;
  const asOfAgeMinutes = lastAsOf ? Math.round((Date.now() - lastAsOf) / 60000) : null;

  if (!STOCKS_ENABLED) {
    return (
      <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">Stocks under construction</span>
      </div>
    );
  }

  if (status === 'loading' && quotes.length === 0) {
    return (
      <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--color-text-secondary)]">{t('stocks_loading')}</span>
        </div>
      </div>
    );
  }

  if (watchlistEmpty) {
    return (
      <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">{t('stocks_empty_watchlist')}</span>
      </div>
    );
  }

  if (status === 'error' && quotes.length === 0) {
    return (
      <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--color-error)]">
          <span>⚠️</span>
          <div className="flex flex-col leading-tight">
            <span>{t('stocks_error')}</span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {t('stocks_retry_in')} {nextRetrySeconds}s
            </span>
            {error && (
              <span className="text-[11px] text-[var(--color-text-secondary)] truncate max-w-[320px]">
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center justify-center">
        <span className="text-sm text-[var(--color-text-secondary)]">{t('stocks_empty')}</span>
      </div>
    );
  }

  const badgeText = sourceInfo.stale
    ? t('stocks_using_cache')
    : error
    ? `${t('stocks_retry_in')} ${nextRetrySeconds}s`
    : sourceInfo.source === 'fallback'
    ? t('stocks_using_fallback')
    : sourceInfo.fromCache
    ? t('stocks_using_cache')
    : null;

  return (
    <div
      className="h-10 bg-[var(--color-widget-bg)] border-b border-[var(--color-widget-border)] flex items-center gap-3 px-4 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={lastUpdatedLabel ? `${t('stocks_last_updated')}: ${lastUpdatedLabel}` : undefined}
    >
      {badgeText && (
        <div
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${
            sourceInfo.stale || error
              ? 'text-[var(--color-warning)] bg-[var(--color-widget-border)]/60'
              : 'text-[var(--color-text-secondary)] bg-[var(--color-widget-border)]/40'
          }`}
        >
          <span>⚠️</span>
          <span className="whitespace-nowrap">{badgeText}</span>
        </div>
      )}
      <div className="flex-1 h-full overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full flex items-center gap-6 overflow-x-hidden whitespace-nowrap"
          style={{ width: 'max-content' }}
        >
          {quotes.map((quote, index) => (
            <div
              key={`${quote.symbol}-${index}`}
              className="flex items-center gap-2 py-1 group cursor-default"
              title={`${quote.name} (${quote.symbol})\n${formatPrice(quote.price, quote.currency)}\n${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {shortenName(quote.name)}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  ({quote.symbol})
                </span>
              </div>

              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {formatPrice(quote.price, quote.currency)}
              </span>

              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${getChangeColor(quote.changePercent)} ${getChangeBgColor(quote.changePercent)}`}
              >
                {quote.changePercent >= 0 ? '+' : ''}
                {quote.changePercent.toFixed(2)}%
              </span>

              {index < quotes.length - 1 && (
                <span className="text-[var(--color-widget-border)] ml-2">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
        {asOfLabel && (
          <span>
            {t('stocks_as_of')}: {asOfLabel}
            {asOfAgeMinutes !== null && ` (${asOfAgeMinutes}m)`}
          </span>
        )}
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-widget-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          title={t('stocks_refresh')}
          disabled={isRefreshing}
        >
          <svg className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9" />
            <path d="M3 12a9 9 0 0 0 9 9" />
            <path d="M3 3v6h6" />
            <path d="M21 21v-6h-6" />
          </svg>
          {t('stocks_refresh')}
        </button>
      </div>
    </div>
  );
}
