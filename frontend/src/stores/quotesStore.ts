import { create } from 'zustand';
import type { Quote } from '../types';

interface QuotesState {
  quotes: Quote[];
  symbols: string[];
  refreshIntervalMinutes: number;
  apiKey?: string;
  lastReceived?: number;
  setQuotes: (quotes: Quote[]) => void;
  setSettings: (settings: Partial<{ symbols: string[]; refreshIntervalMinutes: number; apiKey?: string }>) => void;
}

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'BTC-USD'];
const MIN_REFRESH = 5;

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

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],
  symbols: DEFAULT_SYMBOLS,
  refreshIntervalMinutes: 10,
  lastReceived: undefined,
  apiKey: undefined,
  setQuotes: (quotes) =>
    set({
      quotes,
      lastReceived: Date.now(),
    }),
  setSettings: (settings) =>
    set((state) => {
      const nextSymbols = settings.symbols?.length
        ? normalizeSymbols(settings.symbols)
        : state.symbols;
      const nextRefreshRaw =
        settings.refreshIntervalMinutes !== undefined
          ? settings.refreshIntervalMinutes
          : state.refreshIntervalMinutes;
      const nextRefresh = Math.max(MIN_REFRESH, nextRefreshRaw || MIN_REFRESH);
      const nextApiKey = settings.apiKey !== undefined ? settings.apiKey : state.apiKey;

      const symbolsEqual =
        nextSymbols.length === state.symbols.length &&
        nextSymbols.every((s, idx) => s === state.symbols[idx]);
      const refreshEqual = nextRefresh === state.refreshIntervalMinutes;
      const apiEqual = nextApiKey === state.apiKey;

      if (symbolsEqual && refreshEqual && apiEqual) return state;

      return {
        symbols: nextSymbols,
        refreshIntervalMinutes: nextRefresh,
        apiKey: nextApiKey,
      };
    }),
}));
