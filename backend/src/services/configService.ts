import fs from 'fs';
import path from 'path';
import os from 'os';
import { getSetting, setSetting, CONFIG_DIR } from './db.js';
import type { AppConfig, DashboardConfig, NewsFeedConfig } from '../../../shared/types/index.js';

const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_DASHBOARD: DashboardConfig = {
  theme: 'dark',
  layouts: [
    // Row 0: Clock | Minty | Music | Ambient | Upcoming | Rabbit
    { i: 'clock', x: 0, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'systemPet', x: 1, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'musicPlayer', x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'ambientSound', x: 3, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'upcoming', x: 4, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'rabbitHole', x: 5, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    // Row 1: News (2 wide) | Weather | Calendar | Tasks | System
    { i: 'news', x: 0, y: 1, w: 2, h: 1, minW: 1, minH: 1 },
    { i: 'weather', x: 2, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'calendar', x: 3, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'tasks', x: 4, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
    { i: 'system', x: 5, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
    // Row 2: Extra widgets
    { i: 'pomodoro', x: 0, y: 2, w: 2, h: 1, minW: 1, minH: 1 },
  ],
  widgets: [
    { id: 'clock', type: 'clock', title: 'Uhrzeit & Datum', titleKey: 'widget_clock', enabled: true },
    { id: 'systemPet', type: 'systemPet', title: 'Minty', titleKey: 'widget_systemPet', enabled: true },
    { id: 'system', type: 'system', title: 'System-Metriken', titleKey: 'widget_system', enabled: true },
    { id: 'news', type: 'news', title: 'News', titleKey: 'widget_news', enabled: true },
    { id: 'weather', type: 'weather', title: 'Wetter', titleKey: 'widget_weather', enabled: true },
    { id: 'calendar', type: 'calendar', title: 'Kalender', titleKey: 'widget_calendar', enabled: true },
    { id: 'tasks', type: 'tasks', title: 'Tasks & Notizen', titleKey: 'widget_tasks', enabled: true },
    { id: 'ambientSound', type: 'ambientSound', title: 'Ambient Sounds', titleKey: 'widget_ambientSound', enabled: true },
    { id: 'upcoming', type: 'upcoming', title: 'Warte auf...', titleKey: 'widget_upcoming', enabled: true },
    { id: 'rabbitHole', type: 'rabbitHole', title: 'Rabbit Hole', titleKey: 'widget_rabbitHole', enabled: true },
    { id: 'musicPlayer', type: 'musicPlayer', title: 'Musik', titleKey: 'widget_musicPlayer', enabled: true },
    { id: 'pomodoro', type: 'pomodoro', title: 'Pomodoro', titleKey: 'widget_pomodoro', enabled: false },
  ],
};

const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  locale: 'de-DE',
  timezone: 'Europe/Vienna',
  dashboard: DEFAULT_DASHBOARD,
  news: {
    feeds: [
      { id: 'heise', name: 'Heise', url: 'https://www.heise.de/rss/heise-atom.xml', icon: '💻', enabled: true, colSpan: 1, order: 0 },
      { id: 'golem', name: 'Golem', url: 'https://rss.golem.de/rss.php?feed=ATOM1.0', icon: '🎮', enabled: true, colSpan: 1, order: 1 },
      { id: 'hackernews', name: 'Hacker News', url: 'https://hnrss.org/frontpage', icon: '🔥', enabled: true, colSpan: 1, order: 2 },
      { id: 'yahoo', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', icon: '📈', enabled: true, colSpan: 1, order: 3 },
    ],
    updateInterval: 300000,
  },
  weather: {
    latitude: 48.2082,
    longitude: 16.3738,
    units: 'metric',
    updateInterval: 600000,
  },
  calendar: {
    icsPaths: [],
    caldav: [],
  },
};

function readConfigFile(): Partial<AppConfig> {
  if (!fs.existsSync(CONFIG_PATH)) {
    // Write defaults on first run
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as Partial<AppConfig>;
  } catch (error) {
    console.warn('Failed to read config.json, using defaults', error);
    return {};
  }
}

let cachedConfig: AppConfig | null = null;

function normalizeNewsFeeds(feeds: NewsFeedConfig[]): NewsFeedConfig[] {
  const seen = new Set<string>();
  const normalized: NewsFeedConfig[] = [];

  feeds.forEach((feed, idx) => {
    if (!feed || !feed.id || !feed.name || !feed.url) return;

    const id = feed.id.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);

    normalized.push({
      ...feed,
      id,
      name: feed.name,
      url: feed.url,
      colSpan: Math.min(4, Math.max(1, feed.colSpan ?? 1)),
      enabled: feed.enabled !== false,
      icon: feed.icon || (feed.name ? feed.name.charAt(0).toUpperCase() : '📰'),
      order: typeof feed.order === 'number' ? feed.order : idx,
    });
  });

  return normalized
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f, idx) => ({ ...f, order: idx }));
}

// Merge defaults with file config and DB overrides (for dashboard layout/widgets)
export function loadConfig(): AppConfig {
  const fileConfig = readConfigFile();
  const storedDashboard = getSetting<DashboardConfig>('dashboard', fileConfig.dashboard ?? DEFAULT_DASHBOARD);
  const storedNewsFeeds = getSetting<NewsFeedConfig[]>(
    'newsFeeds',
    fileConfig.news?.feeds ?? DEFAULT_CONFIG.news.feeds
  );

  // Merge dashboard with defaults and ensure new widgets/layouts exist
  const mergedDashboard: DashboardConfig = {
    ...DEFAULT_DASHBOARD,
    ...(fileConfig.dashboard ?? {}),
    ...storedDashboard,
  };

  // Strip deprecated widgets/layouts
  mergedDashboard.widgets = mergedDashboard.widgets.filter((w) => w.id !== 'notionTasks');
  mergedDashboard.layouts = mergedDashboard.layouts.filter((l) => l.i !== 'notionTasks');

  const widgetIds = new Set(mergedDashboard.widgets.map((w) => w.id));
  if (!widgetIds.has('pomodoro')) {
    mergedDashboard.widgets.push({
      id: 'pomodoro',
      type: 'pomodoro',
      title: 'Pomodoro',
      titleKey: 'widget_pomodoro',
      enabled: false,
    });
  }
  if (!mergedDashboard.layouts.find((l) => l.i === 'pomodoro')) {
    mergedDashboard.layouts.push({ i: 'pomodoro', x: 0, y: 2, w: 2, h: 1, minW: 1, minH: 1 });
  }

  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    dashboard: mergedDashboard,
    news: {
      ...DEFAULT_CONFIG.news,
      ...(fileConfig.news ?? {}),
      feeds: normalizeNewsFeeds(storedNewsFeeds ?? []),
    },
  };

  return cachedConfig;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function saveDashboardConfig(dashboard: DashboardConfig) {
  setSetting('dashboard', dashboard);
  if (cachedConfig) {
    cachedConfig = { ...cachedConfig, dashboard };
  }
}

export function saveNewsFeeds(feeds: NewsFeedConfig[]) {
  const normalized = normalizeNewsFeeds(feeds);
  setSetting('newsFeeds', normalized);
  if (cachedConfig) {
    cachedConfig = {
      ...cachedConfig,
      news: {
        ...cachedConfig.news,
        feeds: normalized,
      },
    };
  }
}

export { CONFIG_PATH, DEFAULT_CONFIG, DEFAULT_DASHBOARD };
