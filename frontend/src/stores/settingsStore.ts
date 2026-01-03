import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetSettings {
  id: string;
  enabled: boolean;
}

export type Language = 'de' | 'en' | 'es' | 'sr';

export interface ClockSettings {
  timeFormat: '24h' | '12h' | 'system';
  showSeconds: boolean;
  showDate: boolean;
  dateFormat: 'DMY' | 'MDY' | 'YMD' | 'long' | 'system';
  showWeekday: boolean;
  weekdayFormat: 'short' | 'long';
   size: 'xs' | 's' | 'm' | 'l' | 'xl';
}

export interface AppearanceSettings {
  backgroundOpacity: number; // 0-100
  widgetOpacity: number; // 0-100 (direct alpha for widgets)
  transparencyEnabled: boolean;
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
  mementoMoriEnabled: boolean;
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

export interface WeatherSettings {
  latitude: number;
  longitude: number;
  units: 'metric' | 'imperial';
  locationName: string;
}

export interface CalendarSettings {
  weekStartsOn: 'monday' | 'sunday';
}

interface SettingsState {
  isOpen: boolean;
  activeTab:
    | 'widgets'
    | 'news'
    | 'general'
    | 'pomodoro'
    | 'clock'
    | 'appearance'
    | 'language'
    | 'weather'
    | 'calendar';

  widgets: WidgetSettings[];
  news: NewsSettings;
  general: GeneralSettings;
  pomodoro: PomodoroSettings;
  clock: ClockSettings;
  appearance: AppearanceSettings;
  languageSettings: LanguageSettings;
  weather: WeatherSettings;
  calendar: CalendarSettings;

  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  setActiveTab: (tab: SettingsState['activeTab']) => void;

  toggleWidget: (id: string) => void;
  setWidgets: (widgets: WidgetSettings[]) => void;

  setFeedColSpan: (feedId: string, colSpan: number) => void;

  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setRefreshInterval: (interval: number) => void;
  setGeneralSettings: (settings: Partial<GeneralSettings>) => void;

  setPomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
  setClockSettings: (settings: Partial<ClockSettings>) => void;
  setAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  setLanguageSettings: (settings: Partial<LanguageSettings>) => void;
  setWeatherSettings: (settings: Partial<WeatherSettings>) => void;
  setCalendarSettings: (settings: Partial<CalendarSettings>) => void;
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

const DEFAULT_GENERAL: GeneralSettings = {
  language: 'de',
  theme: 'dark',
  refreshInterval: 60,
  mementoMoriEnabled: true,
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

const DEFAULT_WEATHER: WeatherSettings = {
  latitude: 48.2082,
  longitude: 16.3738,
  units: 'metric',
  locationName: '',
};

const DEFAULT_CALENDAR: CalendarSettings = {
  weekStartsOn: 'monday',
};

const DEFAULT_CLOCK: ClockSettings = {
  timeFormat: 'system',
  showSeconds: true,
  showDate: true,
  dateFormat: 'system',
  showWeekday: true,
  weekdayFormat: 'long',
  size: 'm',
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  backgroundOpacity: 100, // 100 = fully opaque (no transparency)
  widgetOpacity: 100, // 100 = fully opaque widgets
  transparencyEnabled: true,
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
      news: DEFAULT_NEWS,
      general: DEFAULT_GENERAL,
      pomodoro: DEFAULT_POMODORO,
      clock: DEFAULT_CLOCK,
      appearance: DEFAULT_APPEARANCE,
      languageSettings: DEFAULT_LANGUAGE,
      weather: DEFAULT_WEATHER,
      calendar: DEFAULT_CALENDAR,

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

      setGeneralSettings: (settings) =>
        set((state) => ({
          general: { ...(state.general || DEFAULT_GENERAL), ...settings },
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

      setWeatherSettings: (settings) =>
        set((state) => ({
          weather: { ...(state.weather || DEFAULT_WEATHER), ...settings },
        })),

      setCalendarSettings: (settings) =>
        set((state) => ({
          calendar: { ...(state.calendar || DEFAULT_CALENDAR), ...settings },
        })),
    }),
    {
      name: 'dashboard-settings',
      version: 8, // v8: clock size + memento mori toggle
      migrate: (state: any, version: number) => {
        console.log(`[Settings] Migrating from version ${version} to 8`);

        try {
          // Start with a safe baseline
          const next: Partial<SettingsState> = { ...(state || {}) };

          // Widgets: ensure array exists and filter removed widgets
          next.widgets = next.widgets && Array.isArray(next.widgets) && next.widgets.length > 0
            ? next.widgets
            : DEFAULT_WIDGETS;
          next.widgets = (next.widgets || []).filter((w) => w.id !== 'notionTasks');

          // News: merge with defaults
          next.news = { ...DEFAULT_NEWS, ...(next.news || {}) };

          // General: merge and validate language
          next.general = { ...DEFAULT_GENERAL, ...(next.general || {}) };
          if (!['de', 'en', 'es', 'sr'].includes(next.general.language as Language)) {
            console.warn('[Settings] Invalid language, defaulting to de');
            next.general.language = DEFAULT_GENERAL.language;
          }
          if (next.general.mementoMoriEnabled === undefined) {
            next.general.mementoMoriEnabled = true;
          }

          // Pomodoro: merge with defaults
          next.pomodoro = { ...DEFAULT_POMODORO, ...(next.pomodoro || {}) };

          // NEW: Clock settings (added in v4)
          next.clock = { ...DEFAULT_CLOCK, ...(next.clock || {}) };
          if (!next.clock.size) {
            next.clock.size = 'm';
          }

          // NEW: Appearance settings (added in v4)
          next.appearance = { ...DEFAULT_APPEARANCE, ...(next.appearance || {}) };
          // v7: introduce transparencyEnabled + change widgetOpacity to direct alpha (0-100)
          const rawBg = next.appearance?.backgroundOpacity ?? DEFAULT_APPEARANCE.backgroundOpacity;
          const rawWidget = next.appearance?.widgetOpacity ?? DEFAULT_APPEARANCE.widgetOpacity;
          const oldBg = Math.min(1, Math.max(0, rawBg / 100));
          // Old widgetOpacity was an additive boost capped at 0.5
          const oldBoost = Math.min(0.5, Math.max(0, rawWidget / 100));
          const derivedWidgetAlpha = Math.min(1, oldBg + oldBoost);
          next.appearance.backgroundOpacity = Math.round(oldBg * 100);
          next.appearance.widgetOpacity = Math.round(derivedWidgetAlpha * 100);
          if (next.appearance.transparencyEnabled === undefined) {
            next.appearance.transparencyEnabled = true;
          }

          // NEW: Language settings (added in v4)
          next.languageSettings = { ...DEFAULT_LANGUAGE, ...(next.languageSettings || {}) };

          // NEW: Weather settings (added in v5)
          next.weather = { ...DEFAULT_WEATHER, ...(next.weather || {}) };

          // NEW: Calendar settings (added in v5)
          next.calendar = { ...DEFAULT_CALENDAR, ...(next.calendar || {}) };

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
            news: DEFAULT_NEWS,
            general: DEFAULT_GENERAL,
            pomodoro: DEFAULT_POMODORO,
            clock: DEFAULT_CLOCK,
            appearance: DEFAULT_APPEARANCE,
            languageSettings: DEFAULT_LANGUAGE,
            weather: DEFAULT_WEATHER,
            calendar: DEFAULT_CALENDAR,
          } as SettingsState;
        }
      },
    }
  )
);
