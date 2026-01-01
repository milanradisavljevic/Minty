import { useEffect, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import type { CalendarEvent } from '../../types';
import { getLocale, useTranslation } from '../../i18n';

function groupEventsByDay(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const dateKey = new Date(event.start).toDateString();
    acc[dateKey] = acc[dateKey] || [];
    acc[dateKey].push(event);
    return acc;
  }, {});
}

export function CalendarWidget() {
  const { language, t } = useTranslation();
  const locale = getLocale(language);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchEvents() {
      try {
        const response = await fetch('/api/calendar?days=7');
        if (!response.ok) throw new Error(t('calendar_error'));
        const data = await response.json();
        if (mounted && data.events) {
          setEvents(data.events);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : t('calendar_error'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchEvents();

    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_calendar">
        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mr-3" />
          <span>{t('calendar_loading')}</span>
        </div>
      </WidgetWrapper>
    );
  }

  if (error) {
    return (
      <WidgetWrapper titleKey="widget_calendar">
        <div className="flex items-center justify-center h-full text-[var(--color-error)] text-sm">{error}</div>
      </WidgetWrapper>
    );
  }

  const grouped = groupEventsByDay(events.slice(0, 30));
  const days = Object.keys(grouped)
    .map((date) => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return (
    <WidgetWrapper titleKey="widget_calendar" noPadding>
      <div className="h-full overflow-y-auto divide-y divide-[var(--color-widget-border)]">
        {days.length === 0 && (
          <div className="p-4 text-sm text-[var(--color-text-secondary)]">{t('calendar_empty')}</div>
        )}
        {days.map((day) => {
          const dateKey = day.toDateString();
          return (
            <div key={dateKey} className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
                <span>{day.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                <span>
                  {grouped[dateKey].length} {t('calendar_event_count')}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[dateKey].map((event) => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  const timeLabel = event.allDay
                    ? t('calendar_all_day')
                    : `${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`;

                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{event.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                          {event.calendar ?? t('widget_calendar')}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1">{timeLabel}</div>
                      {event.location && (
                        <div className="text-[10px] text-[var(--color-text-secondary)] mt-1 opacity-80">{event.location}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
}
