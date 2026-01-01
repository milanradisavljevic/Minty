import { create } from 'zustand';
import type { SystemMetrics, WidgetLayout, WidgetConfig, DashboardConfig } from '../types';

interface DashboardState {
  // System metrics
  metrics: SystemMetrics | null;
  isConnected: boolean;

  // Widget layouts
  layouts: WidgetLayout[];
  widgets: WidgetConfig[];

  // Theme
  theme: 'dark' | 'light';

  // Actions
  setMetrics: (metrics: SystemMetrics) => void;
  setConnected: (connected: boolean) => void;
  setLayouts: (layouts: WidgetLayout[]) => void;
  updateLayout: (layout: WidgetLayout) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setWidgets: (widgets: WidgetConfig[]) => void;
  setDashboardConfig: (dashboard: DashboardConfig) => void;
  toggleWidgetPin: (widgetId: string) => void;
}

// Default widget configurations for 5-column layout
const defaultWidgets: WidgetConfig[] = [
  { id: 'clock', type: 'clock', title: 'Uhrzeit & Datum', titleKey: 'widget_clock', enabled: true },
  { id: 'system', type: 'system', title: 'System-Metriken', titleKey: 'widget_system', enabled: true },
  { id: 'systemPet', type: 'systemPet', title: 'Minty', titleKey: 'widget_systemPet', enabled: true },
  { id: 'news', type: 'news', title: 'News', titleKey: 'widget_news', enabled: true },
  { id: 'calendar', type: 'calendar', title: 'Kalender', titleKey: 'widget_calendar', enabled: true },
  { id: 'tasks', type: 'tasks', title: 'Tasks & Notizen', titleKey: 'widget_tasks', enabled: true },
  { id: 'weather', type: 'weather', title: 'Wetter', titleKey: 'widget_weather', enabled: true },
  { id: 'pomodoro', type: 'pomodoro', title: 'Pomodoro', titleKey: 'widget_pomodoro', enabled: false },
];

// Default layout for 5120px ultrawide (6 columns)
// Layout: Clock | Minty | News (2 wide) | Weather+System | Calendar+Tasks
const defaultLayouts: WidgetLayout[] = [
  { i: 'clock', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'systemPet', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'news', x: 2, y: 0, w: 2, h: 2, minW: 1, minH: 1 },
  { i: 'weather', x: 4, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'system', x: 4, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'calendar', x: 5, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'tasks', x: 5, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'pomodoro', x: 0, y: 2, w: 2, h: 1, minW: 1, minH: 1 },
];

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  isConnected: false,
  layouts: defaultLayouts,
  widgets: defaultWidgets,
  theme: 'dark',

  setMetrics: (metrics) => set({ metrics }),
  setConnected: (isConnected) => set({ isConnected }),
  setLayouts: (layouts) => set({ layouts }),
  updateLayout: (layout) =>
    set((state) => ({
      layouts: state.layouts.map((l) => (l.i === layout.i ? layout : l)),
    })),
  setTheme: (theme) => set({ theme }),
  setWidgets: (widgets) => set({ widgets }),
  setDashboardConfig: (dashboard) =>
    set(() => ({
      layouts: dashboard.layouts,
      widgets: dashboard.widgets,
      theme: dashboard.theme,
    })),
  toggleWidgetPin: (widgetId) =>
    set((state) => ({
      layouts: state.layouts.map((l) =>
        l.i === widgetId ? { ...l, static: !l.static } : l
      ),
    })),
}));
