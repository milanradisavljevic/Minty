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

export interface ClockSettings {
  timeFormat: '24h' | '12h' | 'system';
  showSeconds: boolean;
  showDate: boolean;
  dateFormat: 'DMY' | 'MDY' | 'YMD' | 'long' | 'system';
  showWeekday: boolean;
  weekdayFormat: 'short' | 'long';
}

export interface AppearanceSettings {
  backgroundOpacity: number; // 0-100
  widgetOpacity: number; // 0-50
  enableBlur: boolean;
  blurStrength: number; // 5-30px
}

export interface LanguageSettings {
  locale: Language;
  mintyLanguage: Language | 'follow'; // 'follow' means follow locale
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
  activeTab: 'widgets' | 'stocks' | 'news' | 'general' | 'pomodoro' | 'clock' | 'appearance' | 'language';

  widgets: WidgetSettings[];
  stocks: StockSettings;
  news: NewsSettings;
  general: GeneralSettings;
  pomodoro: PomodoroSettings;
  clock: ClockSettings;
  appearance: AppearanceSettings;
  languageSettings: LanguageSettings;

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
  setClockSettings: (settings: Partial<ClockSettings>) => void;
  setAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  setLanguageSettings: (settings: Partial<LanguageSettings>) => void;
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

const DEFAULT_CLOCK: ClockSettings = {
  timeFormat: 'system',
  showSeconds: true,
  showDate: true,
  dateFormat: 'system',
  showWeekday: true,
  weekdayFormat: 'long',
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  backgroundOpacity: 100, // 100 = fully opaque (no transparency)
  widgetOpacity: 0, // 0 = no transparency
  enableBlur: false,
  blurStrength: 10,
};

const DEFAULT_LANGUAGE: LanguageSettings = {
  locale: 'de',
  mintyLanguage: 'follow',
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
      clock: DEFAULT_CLOCK,
      appearance: DEFAULT_APPEARANCE,
      languageSettings: DEFAULT_LANGUAGE,

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

      setClockSettings: (settings) =>
        set((state) => ({
          clock: { ...(state.clock || DEFAULT_CLOCK), ...settings },
        })),

      setAppearanceSettings: (settings) =>
        set((state) => ({
          appearance: { ...(state.appearance || DEFAULT_APPEARANCE), ...settings },
        })),

      setLanguageSettings: (settings) =>
        set((state) => ({
          languageSettings: { ...(state.languageSettings || DEFAULT_LANGUAGE), ...settings },
          // Also update general.language for backwards compatibility
          ...(settings.locale && { general: { ...(state.general || DEFAULT_GENERAL), language: settings.locale } }),
        })),
    }),
    {
      name: 'dashboard-settings',
      version: 4, // Incremented for new clock, appearance, language settings
      migrate: (state: any, version: number) => {
        console.log(`[Settings] Migrating from version ${version} to 4`);

        try {
          // Start with a safe baseline
          const next: Partial<SettingsState> = { ...(state || {}) };

          // Widgets: ensure array exists and filter removed widgets
          next.widgets = next.widgets && Array.isArray(next.widgets) && next.widgets.length > 0
            ? next.widgets
            : DEFAULT_WIDGETS;
          next.widgets = (next.widgets || []).filter((w) => w.id !== 'notionTasks');

          // Stocks: merge with defaults, ensure watchlist exists
          next.stocks = {
            ...DEFAULT_STOCKS,
            ...(next.stocks || {}),
          };
          if (!next.stocks.watchlist || next.stocks.watchlist.length === 0) {
            next.stocks.watchlist = DEFAULT_STOCKS.watchlist;
          }

          // News: merge with defaults
          next.news = { ...DEFAULT_NEWS, ...(next.news || {}) };

          // General: merge and validate language
          next.general = { ...DEFAULT_GENERAL, ...(next.general || {}) };
          if (!['de', 'en', 'es', 'sr'].includes(next.general.language as Language)) {
            console.warn('[Settings] Invalid language, defaulting to de');
            next.general.language = DEFAULT_GENERAL.language;
          }

          // Pomodoro: merge with defaults
          next.pomodoro = { ...DEFAULT_POMODORO, ...(next.pomodoro || {}) };

          // NEW: Clock settings (added in v4)
          next.clock = { ...DEFAULT_CLOCK, ...(next.clock || {}) };

          // NEW: Appearance settings (added in v4)
          next.appearance = { ...DEFAULT_APPEARANCE, ...(next.appearance || {}) };

          // NEW: Language settings (added in v4)
          next.languageSettings = { ...DEFAULT_LANGUAGE, ...(next.languageSettings || {}) };

          // Sync languageSettings.locale with general.language for backwards compatibility
          if (next.general && next.general.language) {
            next.languageSettings.locale = next.general.language;
            // Remove duplicate Minty language setting - always follow main language
            next.languageSettings.mintyLanguage = 'follow';
          }

          console.log('[Settings] Migration successful');
          return next as SettingsState;
        } catch (error) {
          console.error('[Settings] Migration failed, using defaults:', error);
          // On error, return complete defaults to prevent crashes
          return {
            isOpen: false,
            activeTab: 'widgets',
            widgets: DEFAULT_WIDGETS,
            stocks: DEFAULT_STOCKS,
            news: DEFAULT_NEWS,
            general: DEFAULT_GENERAL,
            pomodoro: DEFAULT_POMODORO,
            clock: DEFAULT_CLOCK,
            appearance: DEFAULT_APPEARANCE,
            languageSettings: DEFAULT_LANGUAGE,
          } as SettingsState;
        }
      },
    }
  )
);
