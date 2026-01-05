import yahooFinance from 'yahoo-finance2';
import type { Server } from 'socket.io';
import type { Quote } from '../../../shared/types/index.js';
import { getSetting, setSetting } from './db.js';

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'BTC-USD', 'ETH-USD'];
const DEFAULT_ALPHA_KEY = 'WXZCURA1RM9VXFIW';
const DEFAULT_REFRESH_MINUTES = 10;
const MIN_REFRESH_MINUTES = 5;
const STALE_AFTER_MS = 20 * 60 * 1000;
const COINGECKO_SYMBOLS: Record<string, string> = {
  'BTC-USD': 'bitcoin',
  'ETH-USD': 'ethereum',
};
const SYMBOL_CURRENCY_MAP: Record<string, string> = {
  '.DE': 'EUR',
  '.PA': 'EUR',
  '.L': 'GBP',
};

const quoteCache = new Map<string, Quote>();
const inflight = new Map<string, Promise<Quote | null>>();

let lastBroadcast: Quote[] = getSetting<Quote[]>('quotes.cache', []);
let refreshTimer: NodeJS.Timeout | null = null;
let ioRef: Server | null = null;
let alphaApiKey: string | undefined = undefined;

function normalizeSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  return symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => {
      if (!s) return false;
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

function isCrypto(symbol: string): boolean {
  return !!COINGECKO_SYMBOLS[symbol.toUpperCase()];
}

function markStale(quote: Quote): Quote {
  const now = Date.now();
  const staleByTime = now - quote.lastUpdated > STALE_AFTER_MS;
  const staleByMarket = now - quote.marketTime > STALE_AFTER_MS;
  return { ...quote, isStale: quote.isStale || staleByTime || staleByMarket };
}

function getRefreshIntervalMs(): number {
  const minutes = getSetting<number>('quotes.refreshIntervalMinutes', DEFAULT_REFRESH_MINUTES);
  return Math.max(MIN_REFRESH_MINUTES, minutes) * 60 * 1000;
}

export function getDefaultSymbols(): string[] {
  const stored = getSetting<string[]>('topbar.symbols', DEFAULT_SYMBOLS);
  return normalizeSymbols(stored.length ? stored : DEFAULT_SYMBOLS);
}

export function saveDefaultSymbols(symbols: string[]): string[] {
  const normalized = normalizeSymbols(symbols);
  setSetting('topbar.symbols', normalized);
  return normalized;
}

export function saveRefreshIntervalMinutes(minutes: number): number {
  const clamped = Math.max(MIN_REFRESH_MINUTES, Math.min(60 * 24, Math.round(minutes)));
  setSetting('quotes.refreshIntervalMinutes', clamped);
  return clamped;
}

export function saveAlphaApiKey(key?: string) {
  alphaApiKey = key?.trim() || undefined;
  setSetting('quotes.alphaApiKey', alphaApiKey || '');
}

function getAlphaApiKey(): string | undefined {
  if (alphaApiKey !== undefined) return alphaApiKey;
  const stored = getSetting<string>(
    'quotes.alphaApiKey',
    process.env.ALPHA_VANTAGE_API_KEY || DEFAULT_ALPHA_KEY || ''
  );
  alphaApiKey = stored?.trim() ? stored.trim() : undefined;
  return alphaApiKey;
}

function inferCurrency(symbol: string): string {
  const upper = symbol.toUpperCase();
  const suffix = Object.keys(SYMBOL_CURRENCY_MAP).find((suf) => upper.endsWith(suf));
  if (suffix) return SYMBOL_CURRENCY_MAP[suffix];
  return 'USD';
}

async function fetchFromYahoo(symbol: string): Promise<Quote | null> {
  try {
    const result: any = await yahooFinance.quote(symbol, {
      fields: ['symbol', 'regularMarketPrice', 'currency', 'regularMarketChange', 'regularMarketChangePercent', 'regularMarketTime', 'marketState', 'shortName', 'longName'],
    });

    const price = Number(result?.regularMarketPrice ?? 0);
    const currency = result?.currency as string | undefined;

    if (!price || price <= 0 || !currency) {
      return null;
    }

    const marketTimeRaw = result?.regularMarketTime;
    const marketTimeMs = marketTimeRaw ? Number(marketTimeRaw) * 1000 : Date.now();

    const quote: Quote = {
      symbol,
      displayName: result?.shortName || result?.longName || undefined,
      price,
      currency,
      changeAbs: result?.regularMarketChange ?? undefined,
      changePct: result?.regularMarketChangePercent ?? undefined,
      marketTime: marketTimeMs,
      marketState: result?.marketState,
      source: 'yahoo',
      lastUpdated: Date.now(),
      isStale: false,
    };

    return quote;
  } catch (error) {
    console.error(`[Quotes] Yahoo fetch failed for ${symbol}:`, error);
    return null;
  }
}

function alphaRateLimited(payload: any): boolean {
  return !!payload?.Note || !!payload?.['Error Message'];
}

async function fetchFromAlphaVantage(symbol: string): Promise<Quote | null> {
  const key = getAlphaApiKey();
  if (!key) return null;

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GLOBAL_QUOTE');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', key);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    if (alphaRateLimited(data)) {
      console.warn('[Quotes] Alpha Vantage rate limited for', symbol);
      return null;
    }
    const quote = data?.['Global Quote'];
    if (!quote || !quote['05. price']) return null;

    const price = Number(quote['05. price']);
    if (!price || price <= 0) return null;

    const changeAbsRaw = quote['09. change'];
    const changePctRaw = quote['10. change percent'];
    const marketDate = quote['07. latest trading day'];
    const marketTime = marketDate ? new Date(`${marketDate}T16:00:00Z`).getTime() : Date.now();

    return {
      symbol,
      displayName: quote['01. symbol'] || symbol,
      price,
      currency: inferCurrency(symbol),
      changeAbs: changeAbsRaw !== undefined ? Number(changeAbsRaw) : undefined,
      changePct: changePctRaw ? Number(String(changePctRaw).replace('%', '')) : undefined,
      marketTime,
      marketState: 'REGULAR',
      source: 'alphavantage',
      lastUpdated: Date.now(),
      isStale: false,
    };
  } catch (error) {
    console.error(`[Quotes] AlphaVantage fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchCryptoFromAlpha(symbol: string): Promise<Quote | null> {
  const key = getAlphaApiKey();
  if (!key) return null;
  const [fromSymbol, toSymbol] = symbol.split('-');
  if (!fromSymbol || !toSymbol) return null;

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE');
  url.searchParams.set('from_currency', fromSymbol);
  url.searchParams.set('to_currency', toSymbol);
  url.searchParams.set('apikey', key);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    if (alphaRateLimited(data)) {
      console.warn('[Quotes] Alpha Vantage rate limited for crypto', symbol);
      return null;
    }
    const rate = data?.['Realtime Currency Exchange Rate'];
    const price = rate?.['5. Exchange Rate'];
    if (!price) return null;

    const lastRefreshed = rate?.['6. Last Refreshed'];
    const marketTime = lastRefreshed ? new Date(lastRefreshed).getTime() : Date.now();

    return {
      symbol,
      displayName: `${fromSymbol}/${toSymbol}`,
      price: Number(price),
      currency: toSymbol,
      changePct: undefined,
      changeAbs: undefined,
      marketTime,
      marketState: 'REGULAR',
      source: 'alphavantage',
      lastUpdated: Date.now(),
      isStale: false,
    };
  } catch (error) {
    console.error(`[Quotes] AlphaVantage crypto fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFromAlphaVantage(symbol: string): Promise<Quote | null> {
  const key = getAlphaApiKey();
  if (!key) return null;

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GLOBAL_QUOTE');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', key);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    const quote = data?.['Global Quote'];
    if (!quote || !quote['05. price']) return null;

    const price = Number(quote['05. price']);
    if (!price || price <= 0) return null;

    const changeAbsRaw = quote['09. change'];
    const changePctRaw = quote['10. change percent'];
    const marketDate = quote['07. latest trading day'];
    const marketTime = marketDate ? new Date(`${marketDate}T16:00:00Z`).getTime() : Date.now();

    return {
      symbol,
      displayName: quote['01. symbol'] || symbol,
      price,
      currency: inferCurrency(symbol),
      changeAbs: changeAbsRaw !== undefined ? Number(changeAbsRaw) : undefined,
      changePct: changePctRaw ? Number(String(changePctRaw).replace('%', '')) : undefined,
      marketTime,
      marketState: 'REGULAR',
      source: 'alphavantage',
      lastUpdated: Date.now(),
      isStale: false,
    };
  } catch (error) {
    console.error(`[Quotes] AlphaVantage fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchCryptoFromAlpha(symbol: string): Promise<Quote | null> {
  const key = getAlphaApiKey();
  if (!key) return null;
  const [fromSymbol, toSymbol] = symbol.split('-');
  if (!fromSymbol || !toSymbol) return null;

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE');
  url.searchParams.set('from_currency', fromSymbol);
  url.searchParams.set('to_currency', toSymbol);
  url.searchParams.set('apikey', key);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    const rate = data?.['Realtime Currency Exchange Rate'];
    const price = rate?.['5. Exchange Rate'];
    if (!price) return null;

    const lastRefreshed = rate?.['6. Last Refreshed'];
    const marketTime = lastRefreshed ? new Date(lastRefreshed).getTime() : Date.now();

    return {
      symbol,
      displayName: `${fromSymbol}/${toSymbol}`,
      price: Number(price),
      currency: toSymbol,
      changePct: undefined,
      changeAbs: undefined,
      marketTime,
      marketState: 'REGULAR',
      source: 'alphavantage',
      lastUpdated: Date.now(),
      isStale: false,
    };
  } catch (error) {
    console.error(`[Quotes] AlphaVantage crypto fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFromCoingecko(symbol: string): Promise<Quote | null> {
  const id = COINGECKO_SYMBOLS[symbol.toUpperCase()];
  if (!id) return null;

  const vs = symbol.split('-')[1]?.toLowerCase() || 'usd';
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(vs)}&include_last_updated_at=true&include_24hr_change=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko ${response.status}`);
    }
    const payload = (await response.json()) as any;
    const entry = payload?.[id];
    if (!entry) return null;

    const price = entry[vs];
    if (!price || price <= 0) return null;

    const changePct = entry[`${vs}_24h_change`];
    const marketTime = entry.last_updated_at ? Number(entry.last_updated_at) * 1000 : Date.now();

    const quote: Quote = {
      symbol,
      displayName: id,
      price: Number(price),
      currency: vs.toUpperCase(),
      changePct: typeof changePct === 'number' ? changePct : undefined,
      changeAbs: typeof changePct === 'number' ? (price * changePct) / 100 : undefined,
      marketTime,
      source: 'coingecko',
      lastUpdated: Date.now(),
      isStale: false,
    };

    return quote;
  } catch (error) {
    console.error(`[Quotes] CoinGecko fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function loadQuote(symbol: string): Promise<Quote | null> {
  const cached = quoteCache.get(symbol);
  const intervalMs = getRefreshIntervalMs();
  const now = Date.now();

  if (cached && now - cached.lastUpdated < intervalMs) {
    return markStale(cached);
  }

  if (inflight.has(symbol)) {
    return inflight.get(symbol)!;
  }

  const promise = (async () => {
    let quote: Quote | null = null;

    const alphaKey = getAlphaApiKey();
    if (alphaKey) {
      if (isCrypto(symbol)) {
        quote = await fetchCryptoFromAlpha(symbol);
      }
      if (!quote) {
        quote = await fetchFromAlphaVantage(symbol);
      }
    }

    if (!quote) {
      quote = await fetchFromYahoo(symbol);
    }

    // Retry once on invalid data
    if (!quote) {
      quote = await fetchFromYahoo(symbol);
    }

    // Fallback for crypto symbols
    if (!quote && isCrypto(symbol)) {
      quote = await fetchFromCoingecko(symbol);
    }

    // If we still don't have a quote, return stale cache if available
    if (!quote) {
      if (cached) {
        const staleQuote = markStale({ ...cached, lastUpdated: cached.lastUpdated, isStale: true });
        quoteCache.set(symbol, staleQuote);
        return staleQuote;
      }
      return null;
    }

    // Sanity-check sudden moves for non-crypto
    if (cached && !isCrypto(symbol)) {
      const delta = Math.abs((quote.price - cached.price) / cached.price);
      if (delta > 0.5) {
        console.warn(`[Quotes] Large move detected for ${symbol} (${(delta * 100).toFixed(1)}%), retrying once`);
        const retry = await fetchFromYahoo(symbol);
        if (retry && retry.price > 0) {
          quote = retry;
        } else {
          console.warn(`[Quotes] Accepting large move for ${symbol} after retry`);
        }
      }
    }

    const next = markStale(quote);
    quoteCache.set(symbol, next);
    return next;
  })();

  inflight.set(symbol, promise);
  const result = await promise;
  inflight.delete(symbol);
  return result;
}

export async function fetchQuotesForSymbols(symbols: string[]): Promise<Quote[]> {
  const normalized = normalizeSymbols(symbols);
  const start = Date.now();
  const results: Quote[] = [];
  let errors = 0;

  for (const symbol of normalized) {
    const quote = await loadQuote(symbol);
    if (quote) {
      results.push(markStale(quote));
    } else {
      errors += 1;
    }
  }

  const duration = Date.now() - start;
  console.log(`[Quotes] Refresh ${normalized.length} symbols -> ${results.length} ok, ${errors} errors (${duration}ms)`);
  if (results.length) {
    lastBroadcast = results;
    setSetting('quotes.cache', lastBroadcast);
    return results;
  }

  // Fallback to cached data if fetch failed
  if (lastBroadcast.length) {
    console.warn('[Quotes] Using cached quotes due to fetch errors');
    return lastBroadcast.map(markStale);
  }

  return [];
}

export function getCachedQuotes(): Quote[] {
  return lastBroadcast.length ? lastBroadcast.map(markStale) : [];
}

export function getQuotesSettings() {
  return {
    symbols: getDefaultSymbols(),
    refreshIntervalMinutes: getRefreshIntervalMs() / (60 * 1000),
    apiKey: getAlphaApiKey(),
  };
}

export async function refreshQuotes(io?: Server, symbols?: string[]): Promise<Quote[]> {
  const effectiveSymbols = symbols ? normalizeSymbols(symbols) : getDefaultSymbols();
  const quotes = await fetchQuotesForSymbols(effectiveSymbols);
  lastBroadcast = quotes.map(markStale);
  const target = io || ioRef;
  if (target) {
    target.emit('quotes:update', lastBroadcast);
  }
  return lastBroadcast;
}

export function startQuotesScheduler(io: Server) {
  ioRef = io;
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const intervalMs = getRefreshIntervalMs();
  console.log(`[Quotes] Starting scheduler (${(intervalMs / 60000).toFixed(1)} min)`);

  refreshQuotes(ioRef).catch((error) => {
    console.error('[Quotes] Initial refresh failed', error);
  });

  refreshTimer = setInterval(() => {
    refreshQuotes(ioRef).catch((error) => {
      console.error('[Quotes] Scheduled refresh failed', error);
    });
  }, intervalMs);
}

export function restartQuotesScheduler() {
  if (ioRef) {
    startQuotesScheduler(ioRef);
  }
}

export async function updateQuoteSettings(
  settings: { symbols?: string[]; refreshIntervalMinutes?: number; apiKey?: string },
  io?: Server
) {
  let normalizedSymbols: string[] | undefined;
  if (settings.symbols) {
    normalizedSymbols = saveDefaultSymbols(settings.symbols);
  }
  if (settings.refreshIntervalMinutes !== undefined) {
    saveRefreshIntervalMinutes(settings.refreshIntervalMinutes);
  }
  if (settings.apiKey !== undefined) {
    saveAlphaApiKey(settings.apiKey);
  }
  restartQuotesScheduler();
  await refreshQuotes(io || ioRef, normalizedSymbols);
}
