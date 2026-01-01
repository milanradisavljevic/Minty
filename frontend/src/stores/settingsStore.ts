import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetSettings {
  id: string;
  enabled: boolean;
}

export type Language = 'de' | 'en' | 'es' | 'sr';

export interface StockSettings {
  watchlist: string[];
  updateInterval: number;
}

export interface GeneralSettings {
  language: Language;
  theme: 'dark' | 'light';
  refreshInterval: number; // in seconds
}

export interface PomodoroSettings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsBeforeLongBreak: number;
}

export interface NewsSettings {
  feedColSpan: Record<string, number>; // feedId -> column span (1-4)
}

interface SettingsState {
  isOpen: boolean;
  activeTab: 'widgets' | 'stocks' | 'news' | 'general' | 'pomodoro';

  widgets: WidgetSettings[];
  stocks: StockSettings;
  news: NewsSettings;
  general: GeneralSettings;
  pomodoro: PomodoroSettings;

  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  setActiveTab: (tab: SettingsState['activeTab']) => void;

  toggleWidget: (id: string) => void;
  setWidgets: (widgets: WidgetSettings[]) => void;

  addStock: (symbol: string) => void;
  removeStock: (symbol: string) => void;
  setStockUpdateInterval: (interval: number) => void;

  setFeedColSpan: (feedId: string, colSpan: number) => void;

  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setRefreshInterval: (interval: number) => void;

  setPomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
}

const DEFAULT_WIDGETS: WidgetSettings[] = [
  { id: 'clock', enabled: true },
  { id: 'systemPet', enabled: true },
  { id: 'musicPlayer', enabled: true },
  { id: 'ambientSound', enabled: true },
  { id: 'upcoming', enabled: true },
  { id: 'rabbitHole', enabled: true },
  { id: 'news', enabled: true },
  { id: 'weather', enabled: true },
  { id: 'calendar', enabled: true },
  { id: 'tasks', enabled: true },
  { id: 'system', enabled: true },
  { id: 'pomodoro', enabled: false },
];

const DEFAULT_STOCKS: StockSettings = {
  watchlist: [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
    'GC=F', 'SI=F', 'BTC-USD',
  ],
  updateInterval: 120000,
};

const DEFAULT_GENERAL: GeneralSettings = {
  language: 'de',
  theme: 'dark',
  refreshInterval: 60,
};

const DEFAULT_POMODORO: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

const DEFAULT_NEWS: NewsSettings = {
  feedColSpan: {
    heise: 1,
    golem: 1,
    hackernews: 1,
    yahoo: 1,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeTab: 'widgets',

      widgets: DEFAULT_WIDGETS,
      stocks: DEFAULT_STOCKS,
      news: DEFAULT_NEWS,
      general: DEFAULT_GENERAL,
      pomodoro: DEFAULT_POMODORO,

      openSettings: () => set({ isOpen: true }),
      closeSettings: () => set({ isOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleWidget: (id) =>
        set((state) => ({
          widgets: (state.widgets || DEFAULT_WIDGETS).map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        })),

      setWidgets: (widgets) => set({ widgets }),

      addStock: (symbol) =>
        set((state) => {
          const upper = symbol.toUpperCase().trim();
          const currentWatchlist = state.stocks?.watchlist ?? DEFAULT_STOCKS.watchlist;
          if (!upper || currentWatchlist.includes(upper)) return state;
          return {
            stocks: {
              ...(state.stocks || DEFAULT_STOCKS),
              watchlist: [...currentWatchlist, upper],
            },
          };
        }),

      removeStock: (symbol) =>
        set((state) => ({
          stocks: {
            ...(state.stocks || DEFAULT_STOCKS),
            watchlist: (state.stocks?.watchlist ?? DEFAULT_STOCKS.watchlist).filter((s) => s !== symbol),
          },
        })),

      setStockUpdateInterval: (interval) =>
        set((state) => ({
          stocks: { ...(state.stocks || DEFAULT_STOCKS), updateInterval: interval },
        })),

      setFeedColSpan: (feedId, colSpan) =>
        set((state) => ({
          news: {
            ...(state.news || DEFAULT_NEWS),
            feedColSpan: { ...(state.news?.feedColSpan || {}), [feedId]: colSpan },
          },
        })),

      setLanguage: (language) =>
        set((state) => ({
          general: { ...(state.general || DEFAULT_GENERAL), language },
        })),

      setTheme: (theme) =>
        set((state) => ({
          general: { ...(state.general || DEFAULT_GENERAL), theme },
        })),

      setRefreshInterval: (refreshInterval) =>
        set((state) => ({
          general: { ...(state.general || DEFAULT_GENERAL), refreshInterval },
        })),

      setPomodoroSettings: (settings) =>
        set((state) => ({
          pomodoro: { ...(state.pomodoro || DEFAULT_POMODORO), ...settings },
        })),
    }),
    {
      name: 'dashboard-settings',
      version: 3,
      migrate: (state: any, _version) => {
        // Ensure defaults for new fields and guard against empty watchlists
        const next: Partial<SettingsState> = { ...(state || {}) };
        next.widgets = next.widgets && Array.isArray(next.widgets) && next.widgets.length > 0 ? next.widgets : DEFAULT_WIDGETS;
        next.widgets = (next.widgets || []).filter((w) => w.id !== 'notionTasks');
        next.stocks = {
          ...DEFAULT_STOCKS,
          ...(next.stocks || {}),
        };
        if (!next.stocks.watchlist || next.stocks.watchlist.length === 0) {
          next.stocks.watchlist = DEFAULT_STOCKS.watchlist;
        }
        next.news = { ...DEFAULT_NEWS, ...(next.news || {}) };
        next.general = { ...DEFAULT_GENERAL, ...(next.general || {}) };
        if (!['de', 'en', 'es', 'sr'].includes(next.general.language as Language)) {
          next.general.language = DEFAULT_GENERAL.language;
        }
        next.pomodoro = { ...DEFAULT_POMODORO, ...(next.pomodoro || {}) };
        return next as SettingsState;
      },
    }
  )
);
