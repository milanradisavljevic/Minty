import { useState, useCallback, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import GridLayout from 'react-grid-layout';
import type * as RGL from 'react-grid-layout';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSocket } from '../hooks/useSocket';
import { StockTickerBar } from './StockTickerBar';
import { TimelineBar } from './TimelineBar';
import { SettingsModal } from './SettingsModal';
import { WidgetContextMenu } from './WidgetContextMenu';
import { useTranslation } from '../i18n';
import { WIDGET_TITLE_KEYS } from '../constants/widgets';
import {
  ClockWidget,
  CalendarWidget,
  SystemWidget,
  SystemPet,
  TasksWidget,
  WeatherWidget,
  NewsWidget,
  AmbientSoundWidget,
  UpcomingWidget,
  RabbitHoleWidget,
  MusicPlayerWidget,
  PomodoroWidget,
} from './widgets';
import type { WidgetLayout } from '../types';

// Widget component map
const widgetComponents: Record<string, React.ComponentType> = {
  clock: ClockWidget,
  calendar: CalendarWidget,
  system: SystemWidget,
  systemPet: SystemPet,
  tasks: TasksWidget,
  weather: WeatherWidget,
  news: NewsWidget,
  ambientSound: AmbientSoundWidget,
  upcoming: UpcomingWidget,
  rabbitHole: RabbitHoleWidget,
  musicPlayer: MusicPlayerWidget,
  pomodoro: PomodoroWidget,
};

// Heights for fixed bars
const TICKER_HEIGHT = 40;
const TIMELINE_HEIGHT = 60;
const CONTROL_BAR_HEIGHT = 64;
const GRID_PADDING = 16;

export function Dashboard() {
  // Initialize WebSocket connection
  useSocket();
  const { t } = useTranslation();

  const layouts = useDashboardStore((state) => state.layouts);
  const setLayouts = useDashboardStore((state) => state.setLayouts);
  const widgets = useDashboardStore((state) => state.widgets);
  const setWidgets = useDashboardStore((state) => state.setWidgets);
  const isConnected = useDashboardStore((state) => state.isConnected);
  const setDashboardTheme = useDashboardStore((state) => state.setTheme);
  const setDashboardConfig = useDashboardStore((state) => state.setDashboardConfig);
  const theme = useDashboardStore((state) => state.theme);

  // Settings store
  const openSettings = useSettingsStore((state) => state.openSettings);
  const widgetSettings = useSettingsStore((state) => state.widgets ?? []);
  const generalTheme = useSettingsStore((state) => state.general?.theme ?? 'dark');

  // Window dimensions for responsive grid
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const saveTimer = useRef<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ widgetId: string; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, widgetId: string) => {
    e.preventDefault();
    setContextMenu({ widgetId, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load dashboard config from backend
  useEffect(() => {
    let mounted = true;
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to load config');
        const data = await response.json();
        if (mounted && data.config?.dashboard) {
          setDashboardConfig(data.config.dashboard);
        }
      } catch (error) {
        console.error('Config fetch failed', error);
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    }
    fetchConfig();
    return () => {
      mounted = false;
    };
  }, [setDashboardConfig]);

  const persistDashboard = useCallback(
    (newLayouts: WidgetLayout[]) => {
      const payload = {
        theme,
        layouts: newLayouts,
        widgets,
      };
      fetch('/api/config/dashboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((error) => console.error('Failed to persist layout', error));
    },
    [theme, widgets]
  );

  // Handle layout changes
  const handleLayoutChange = useCallback(
    (newLayout: RGL.Layout[]) => {
      const normalizedLayout = newLayout.map((item) => ({ ...item })) as unknown as WidgetLayout[];
      setLayouts(normalizedLayout);
      // Debounce saving to backend to avoid spamming while dragging
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        persistDashboard(normalizedLayout);
      }, 500);
    },
    [setLayouts, persistDashboard]
  );

  // Calculate grid parameters accounting for ticker and timeline
  const cols = 6;
  const availableHeight = dimensions.height - TICKER_HEIGHT - TIMELINE_HEIGHT - CONTROL_BAR_HEIGHT - GRID_PADDING * 2;
  const maxRow = layouts.length > 0 ? Math.max(...layouts.map((l) => l.y + l.h)) : 2;
  const rowHeight = Math.max(120, Math.floor(availableHeight / Math.max(2, maxRow))); // adapt to rows
  const margin: [number, number] = [16, 16];
  const GridLayoutComponent = GridLayout as unknown as ComponentType<any>;

  // Ensure widgets from settings are present in dashboard store/layout
  useEffect(() => {
    const widgetSettingsMap = new Map(widgetSettings.map((w) => [w.id, w]));
    const existingIds = new Set(widgets.map((w) => w.id));
    let changed = false;

    const syncedWidgets = widgets.map((widget) => {
      const setting = widgetSettingsMap.get(widget.id);
      const titleKey = WIDGET_TITLE_KEYS[widget.id] || widget.titleKey;
      const nextWidget = {
        ...widget,
        ...(setting ? { enabled: setting.enabled } : {}),
        ...(titleKey ? { titleKey, title: titleKey } : {}),
      };

      if (
        (setting && widget.enabled !== setting.enabled) ||
        (titleKey && widget.titleKey !== titleKey) ||
        (titleKey && widget.title !== titleKey)
      ) {
        changed = true;
      }
      return nextWidget;
    });

    const newLayouts = [...layouts];

    widgetSettings.forEach((setting) => {
      if (!existingIds.has(setting.id) && widgetComponents[setting.id]) {
        changed = true;
        const titleKey = WIDGET_TITLE_KEYS[setting.id] || setting.id;
        syncedWidgets.push({
          id: setting.id,
          type: setting.id as any,
          title: titleKey,
          titleKey,
          enabled: setting.enabled,
        });
      }

      if (!newLayouts.find((l) => l.i === setting.id)) {
        const nextY = newLayouts.length > 0 ? Math.max(...newLayouts.map((l) => l.y + l.h)) : 2;
        newLayouts.push({ i: setting.id, x: 0, y: nextY, w: 1, h: 1, minW: 1, minH: 1 });
      }
    });

    if (changed || newLayouts.length !== layouts.length) {
      setWidgets(syncedWidgets);
      setLayouts(newLayouts);
    }
  }, [widgetSettings, widgets, layouts, setLayouts, setWidgets]);

  useEffect(() => {
    setDashboardTheme(generalTheme);
    document.documentElement.classList.toggle('theme-light', generalTheme === 'light');
    document.documentElement.classList.toggle('theme-dark', generalTheme === 'dark');
    document.documentElement.style.colorScheme = generalTheme === 'light' ? 'light' : 'dark';
  }, [generalTheme, setDashboardTheme]);

  return (
    <div className="w-full h-screen flex flex-col bg-[var(--color-dashboard-bg)]">
      {/* Stock Ticker Bar - Top */}
      <StockTickerBar />

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main Grid Area with top-left controls */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 left-0 z-40 px-4 py-3 flex flex-wrap items-center gap-3 bg-[var(--color-dashboard-bg)]/85 backdrop-blur-md border-b border-[var(--color-widget-border)]">
          <button
            onClick={openSettings}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
            title={t('settings_button_tooltip')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/20 text-[var(--color-error)]'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
              }`}
            />
            {isConnected ? t('connection_connected') : t('connection_disconnected')}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {loadingConfig ? (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mr-3" />
              <span>{t('loading_config')}</span>
            </div>
          ) : (
            <GridLayoutComponent
              className="layout"
              layout={layouts}
              cols={cols}
              rowHeight={rowHeight}
              width={dimensions.width - 32} // Account for padding
              margin={margin}
              containerPadding={[0, 0]}
              onLayoutChange={(layout: RGL.Layout[]) => handleLayoutChange(layout)}
              draggableHandle=".widget-drag-handle"
              useCSSTransforms={true}
              compactType={null}
              preventCollision={true}
            >
              {widgets
                .filter((widget) => {
                  // Check both backend config and local settings
                  const setting = widgetSettings.find((s) => s.id === widget.id);
                  const enabled = setting ? setting.enabled : widget.enabled;
                  return enabled;
                })
                .map((widget) => {
                  const WidgetComponent = widgetComponents[widget.type];
                  if (!WidgetComponent) return null;

                  const layout = layouts.find((l) => l.i === widget.id);
                  const isPinned = layout?.static ?? false;

                  return (
                    <div
                      key={widget.id}
                      className="widget-container relative"
                      onContextMenu={(e) => handleContextMenu(e, widget.id)}
                    >
                      <WidgetComponent />
                      {isPinned && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-accent)]/80 text-white text-[10px] z-10"
                          title={t('widget_pin')}
                        >
                          📌
                        </div>
                      )}
                    </div>
                  );
                })}
            </GridLayoutComponent>
          )}
        </div>
      </div>

      {/* Timeline Bar - Bottom */}
      <TimelineBar />

      {/* Widget Context Menu */}
      {contextMenu && (
        <WidgetContextMenu
          widgetId={contextMenu.widgetId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
