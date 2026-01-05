import type { Quote } from '../types';

const ALPHAVANTAGE_URL = 'https://www.alphavantage.co/query';

function parseChangePercent(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace('%', '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function parseMarketTime(raw: string | undefined): number {
  if (!raw) return Date.now();
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export async function fetchStockData(symbol: string, apiKey: string): Promise<Quote> {
  const trimmedSymbol = symbol.trim();
  if (!trimmedSymbol) throw new Error('Kein Symbol angegeben');
  if (!apiKey) throw new Error('API-Key fehlt');

  const url = `${ALPHAVANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(trimmedSymbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}`);
  }

  const data = await res.json();
  const quote = data?.['Global Quote'];

  if (!quote || !quote['05. price']) {
    const message =
      data?.['Error Message'] ||
      data?.['Note'] ||
      `Keine Daten für ${trimmedSymbol} erhalten`;
    throw new Error(message);
  }

  const price = Number(quote['05. price']);
  const changeAbs = Number(quote['09. change']);
  const changePct = parseChangePercent(quote['10. change percent']);

  if (!Number.isFinite(price)) {
    throw new Error(`Ungültiger Preis für ${trimmedSymbol}`);
  }

  return {
    symbol: (quote['01. symbol'] || trimmedSymbol).toUpperCase(),
    displayName: quote['01. symbol'] || trimmedSymbol.toUpperCase(),
    price,
    currency: 'USD',
    changeAbs: Number.isFinite(changeAbs) ? changeAbs : undefined,
    changePct,
    marketTime: parseMarketTime(quote['07. latest trading day']),
    marketState: undefined,
    source: 'alphavantage',
    lastUpdated: Date.now(),
    isStale: false,
  };
}
