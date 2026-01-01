import YahooFinance from 'yahoo-finance2';
import { getConfig } from '../services/configService.js';
import type { StockQuote, StockQuotesResponse } from '../../../shared/types/index.js';

// Initialize Yahoo Finance instance (required since v3)
const yahooFinance = new YahooFinance();
const STOCKS_DEBUG =
  process.env.STOCKS_DEBUG === '1' || process.env.STOCKS_DEBUG === 'true';
const ALLOW_FALLBACK =
  process.env.STOCKS_ALLOW_FALLBACK === '1' || process.env.STOCKS_ALLOW_FALLBACK === 'true';

type PriceSource = 'regular' | 'post' | 'pre' | 'fallback';

interface CachedQuote {
  quote: StockQuote;
  fetchedAt: number;
}

const quoteCache = new Map<string, CachedQuote>();

// TTL per asset class
const TTL_EQUITY_MS = 240_000; // 4 min
const TTL_FUTURES_MS = 120_000; // 2 min
const TTL_CRYPTO_MS = 90_000; // 1.5 min

// Max allowed market-time age before forcing refetch
const MAX_AGE_EQUITY_MS = 600_000; // 10 min
const MAX_AGE_FUTURES_MS = 600_000; // 10 min
const MAX_AGE_CRYPTO_MS = 300_000; // 5 min

const FALLBACK_BASE_PRICES: Record<string, number> = {
  AAPL: 190.12,
  MSFT: 420.18,
  GOOGL: 145.22,
  AMZN: 168.65,
  NVDA: 500.12,
  META: 350.91,
  TSLA: 260.32,
  'GC=F': 2300.11,
  'SI=F': 27.4,
  'BTC-USD': 58_000.23,
};

const NAME_OVERRIDES: Record<string, string> = {
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet (Google)',
  AMZN: 'Amazon',
  NVDA: 'NVIDIA',
  META: 'Meta Platforms',
  TSLA: 'Tesla',
  'GC=F': 'Gold Futures',
  'SI=F': 'Silver Futures',
  'BTC-USD': 'Bitcoin',
};

const isCrypto = (symbol: string) => symbol.toUpperCase().endsWith('-USD');
const isFuture = (symbol: string) => symbol.includes('=F');

function debugLog(message: string, details?: Record<string, unknown>) {
  if (!STOCKS_DEBUG) return;
  if (details) {
    console.log(message, details);
  } else {
    console.log(message);
  }
}

function getTtlMs(symbol: string): number {
  if (isCrypto(symbol)) return TTL_CRYPTO_MS;
  if (isFuture(symbol)) return TTL_FUTURES_MS;
  return TTL_EQUITY_MS;
}

function getMaxAgeMs(symbol: string): number {
  if (isCrypto(symbol)) return MAX_AGE_CRYPTO_MS;
  if (isFuture(symbol)) return MAX_AGE_FUTURES_MS;
  return MAX_AGE_EQUITY_MS;
}

function normalizeTime(raw?: number | string | Date): number | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  // number
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

function normalizePrice(value?: number): number | undefined {
  if (typeof value !== 'number') return undefined;
  return Number.isFinite(value) ? value : undefined;
}

export function parseYahooQuote(symbol: string, raw: unknown, now = Date.now()): StockQuote | null {
  const quote = raw as {
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketTime?: number | string | Date;
    postMarketPrice?: number;
    postMarketTime?: number | string | Date;
    preMarketPrice?: number;
    preMarketTime?: number | string | Date;
    currency?: string;
  };

  const priceCandidates: Array<{ price?: number; time?: number | string | Date; source: PriceSource }> = [
    { price: normalizePrice(quote.regularMarketPrice), time: quote.regularMarketTime, source: 'regular' },
    { price: normalizePrice(quote.postMarketPrice), time: quote.postMarketTime, source: 'post' },
    { price: normalizePrice(quote.preMarketPrice), time: quote.preMarketTime, source: 'pre' },
  ];

  const selected = priceCandidates.find((p) => p.price !== undefined);
  if (!selected || selected.price === undefined) {
    console.warn(`No price for symbol: ${symbol}`);
    return null;
  }

  const asOf = normalizeTime(selected.time) ?? now;
  const normalizedInput = symbol.toUpperCase();
  const resolvedSymbol = (quote.symbol || normalizedInput).toUpperCase();
  const resolvedName = NAME_OVERRIDES[normalizedInput] || quote.shortName || quote.longName || resolvedSymbol;

  if (resolvedSymbol !== normalizedInput) {
    debugLog('Stock symbol normalized', { requested: normalizedInput, resolved: resolvedSymbol });
  }

  return {
    symbol: resolvedSymbol,
    name: resolvedName,
    price: selected.price,
    change: quote.regularMarketChange ?? 0,
    changePercent: quote.regularMarketChangePercent ?? 0,
    currency: quote.currency || 'USD',
    asOf,
    priceSource: selected.source,
    fetchedAt: now,
  };
}

async function fetchQuoteFromApi(symbol: string): Promise<StockQuote | null> {
  try {
    debugLog('Stock quote request', { symbol });
    const result = await yahooFinance.quote(symbol);
    const now = Date.now();
    const parsed = parseYahooQuote(symbol, result, now);

    debugLog('Stock quote response', {
      symbol,
      raw: result,
      parsed,
      currency: parsed?.currency,
      asOf: parsed?.asOf,
      price: parsed?.price,
    });

    return parsed;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function isCacheValid(symbol: string, entry: CachedQuote, now: number): boolean {
  const ttl = getTtlMs(symbol);
  const maxAge = getMaxAgeMs(symbol);

  if (now - entry.fetchedAt > ttl) return false;
  if (entry.quote.asOf && now - entry.quote.asOf > maxAge) return false;
  return true;
}

function buildFallbackQuotes(symbols: string[], now: number): StockQuote[] {
  return symbols.map((symbol) => {
    const base = FALLBACK_BASE_PRICES[symbol] ?? 100 + (symbol.charCodeAt(0) % 50);
    const jitter = (Math.sin(now / 60_000 + symbol.length) * 2).toFixed(2);
    const percent = Number((Math.sin(now / 120_000 + symbol.length) * 1.5).toFixed(2));
    const price = Number((base + Number(jitter)).toFixed(2));
    return {
      symbol,
      name: NAME_OVERRIDES[symbol] || symbol,
      price,
      change: Number(((price * percent) / 100).toFixed(2)),
      changePercent: percent,
      currency: 'USD',
      asOf: now,
      priceSource: 'fallback',
      fetchedAt: now,
    };
  });
}

interface QuoteOptions {
  force?: boolean;
}

type QuoteFetcher = (symbol: string) => Promise<StockQuote | null>;
let quoteFetcher: QuoteFetcher = fetchQuoteFromApi;

export function setQuoteFetcherForTest(fetcher?: QuoteFetcher) {
  quoteFetcher = fetcher ?? fetchQuoteFromApi;
}

export function clearQuoteCacheForTest() {
  quoteCache.clear();
}

export function setCachedQuoteForTest(symbol: string, quote: StockQuote, fetchedAt: number) {
  quoteCache.set(symbol, { quote, fetchedAt });
}

export async function getStockQuotes(symbols?: string[], options?: QuoteOptions): Promise<StockQuotesResponse> {
  const now = Date.now();
  const requestedRaw = symbols && symbols.length > 0 ? symbols : getConfig().stocks.watchlist;

  // Unique, ordered watchlist (preserve first occurrence)
  const seen = new Set<string>();
  const watchlist = requestedRaw
    .map((s) => s.toUpperCase().trim())
    .filter((s) => s.length > 0 && !seen.has(s) && (seen.add(s) || true));

  if (watchlist.length === 0) {
    return { quotes: [], fromCache: false, stale: false, missing: [], timestamp: now, source: 'live' };
  }

  const results = new Map<string, StockQuote>();
  const missing = new Set<string>();
  let servedFromCache = true;
  let usedCacheDueToError = false;

  for (const symbol of watchlist) {
    const cached = quoteCache.get(symbol);
    if (!options?.force && cached && isCacheValid(symbol, cached, now)) {
      results.set(symbol, cached.quote);
      continue;
    }

    const fresh = await quoteFetcher(symbol);
    if (fresh) {
      results.set(symbol, fresh);
      quoteCache.set(symbol, { quote: fresh, fetchedAt: fresh.fetchedAt ?? now });
      servedFromCache = false;
    } else if (cached && !options?.force) {
      const maxAge = getMaxAgeMs(symbol);
      const age = cached.quote.asOf ? now - cached.quote.asOf : Number.POSITIVE_INFINITY;
      if (age <= maxAge) {
        results.set(symbol, cached.quote);
        usedCacheDueToError = true;
      } else {
        missing.add(symbol);
      }
    } else {
      missing.add(symbol);
    }
  }

  const orderedQuotes: StockQuote[] = [];
  for (const symbol of watchlist) {
    const quote = results.get(symbol);
    if (quote) {
      orderedQuotes.push(quote);
    } else {
      missing.add(symbol);
    }
  }

  console.log('Stock quotes request', {
    requested: watchlist,
    returned: orderedQuotes.map((q) => q.symbol),
    missing: [...missing],
    force: options?.force ?? false,
  });

  const missingList = [...missing];
  if (missingList.length > 0) {
    console.warn(`Missing quotes for symbols: ${missingList.join(', ')}`);
  }

  if (orderedQuotes.length === 0) {
    if (ALLOW_FALLBACK) {
      const fallbackQuotes = buildFallbackQuotes(watchlist, now);
      return {
        quotes: fallbackQuotes,
        fromCache: false,
        stale: true,
        missing: watchlist,
        error: 'Using fallback data (upstream unavailable)',
        timestamp: now,
        source: 'fallback',
      };
    }

    return {
      quotes: [],
      fromCache: false,
      stale: true,
      missing: watchlist,
      error: 'No stock data available (upstream unavailable)',
      timestamp: now,
      source: 'live',
    };
  }

  const anyStale =
    usedCacheDueToError || orderedQuotes.some((q) => now - (q.asOf || now) > getMaxAgeMs(q.symbol));

  return {
    quotes: orderedQuotes,
    fromCache: servedFromCache,
    stale: anyStale,
    missing: missingList,
    error: missingList.length > 0 ? `Missing symbols: ${missingList.join(', ')}` : undefined,
    timestamp: now,
    source: servedFromCache ? 'cache' : 'live',
  };
}

export function getWatchlist(): string[] {
  return [...getConfig().stocks.watchlist];
}
