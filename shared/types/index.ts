// System metrics types
export interface CpuMetrics {
  overall: number;
  cores: number[];
  model: string;
  speed: number;
  cores_count: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface DiskMetrics {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  percent: number;
  mount: string;
}

export interface NetworkMetrics {
  interface: string;
  rx_sec: number;
  tx_sec: number;
  rx_bytes: number;
  tx_bytes: number;
}

export interface GpuMetrics {
  model: string;
  temp: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
}

export interface MetricsHistory {
  cpu: number[];
  memory: number[];
  networkRx: number[];
  networkTx: number[];
  timestamps: number[];
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disks: DiskMetrics[];
  network: NetworkMetrics[];
  gpu?: GpuMetrics;
  uptime: number;
  timestamp: number;
   temperature?: number;
  history?: MetricsHistory;
}

// Widget types
export type WidgetType =
  | 'clock'
  | 'calendar'
  | 'system'
  | 'tasks'
  | 'weather'
  | 'news'
  | 'systemPet'
  | 'ambientSound'
  | 'upcoming'
  | 'rabbitHole'
  | 'musicPlayer'
  | 'pomodoro'
  | 'decisionLog';

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean; // Makes widget non-draggable/resizable
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  titleKey?: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}

// Dashboard config
export interface DashboardConfig {
  theme: 'dark' | 'light';
  layouts: WidgetLayout[];
  widgets: WidgetConfig[];
}

// News/weather/calendar config
export interface NewsFeedConfig {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled?: boolean;
  colSpan?: number;
  order?: number;
}

export interface NewsConfig {
  feeds: NewsFeedConfig[];
  updateInterval: number;
}

export interface WeatherConfig {
  latitude: number;
  longitude: number;
  units: 'metric' | 'imperial';
  updateInterval: number;
}

export interface CalendarSource {
  url: string;
  username?: string;
  password?: string;
  name?: string;
}

export interface CalendarConfig {
  icsPaths: string[];
  caldav: CalendarSource[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay?: boolean;
  location?: string;
  calendar?: string;
}

export interface AppConfig {
  theme: 'dark' | 'light';
  locale: string;
  timezone: string;
  dashboard: DashboardConfig;
  news: NewsConfig;
  weather: WeatherConfig;
  calendar: CalendarConfig;
}

// News types
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
}

export interface NewsFeed {
  id: string;
  name: string;
  icon: string;
  items: NewsItem[];
  lastUpdated: number;
  colSpan?: number;
}

// Weather
export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProb: number;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  updatedAt: number;
  daily: DailyForecast[];
}

// Tasks & Notes
export interface Task {
  id: number;
  title: string;
  completed: boolean;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// Decision Log
export interface Decision {
  id: number;
  title: string;
  reason?: string;
  createdAt: number;
  updatedAt: number;
}

// WebSocket events
export interface ServerToClientEvents {
  'metrics:update': (data: SystemMetrics) => void;
  'connection:status': (status: 'connected' | 'disconnected') => void;
}

export interface ClientToServerEvents {
  'metrics:subscribe': () => void;
  'metrics:unsubscribe': () => void;
}
