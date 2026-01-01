import { useEffect, useState } from 'react';
import type { CalendarEvent } from '../types';
import { getLocale, useTranslation } from '../i18n';

export function TimelineBar() {
  const { language, t } = useTranslation();
  const locale = getLocale(language);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch calendar events
  useEffect(() => {
    let mounted = true;

    async function fetchEvents() {
      try {
        const response = await fetch('/api/calendar?days=1');
        if (!response.ok) throw new Error('Failed to load calendar events');
        const data = await response.json();
        if (mounted && data.events) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch calendar events', error);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate progress through the day
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutesInDay = 24 * 60;
  const minutesPassed = hours * 60 + minutes;
  const progressPercent = (minutesPassed / totalMinutesInDay) * 100;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  // Calculate remaining time
  const remainingMinutes = totalMinutesInDay - minutesPassed;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // Format current time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format hour label
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Get events for today
  const todayEvents = events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (start >= today && start < tomorrow) || (end > today && start < today);
  });

  // Calculate event position and width
  const getEventStyle = (event: CalendarEvent) => {
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const eventStart = Math.max(event.start, dayStart.getTime());
    const eventEnd = Math.min(event.end, dayEnd.getTime());

    const startMinutes = (eventStart - dayStart.getTime()) / 60000;
    const endMinutes = (eventEnd - dayStart.getTime()) / 60000;

    const left = (startMinutes / totalMinutesInDay) * 100;
    const width = Math.max(1, ((endMinutes - startMinutes) / totalMinutesInDay) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Hour markers to display
  const hourMarkers = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  return (
    <div className="h-16 bg-[var(--color-widget-bg)] border-t border-[var(--color-widget-border)] flex flex-col">
      {/* Main timeline area */}
      <div className="flex-1 relative px-4 py-2">
        {/* Background track */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-2 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
          {/* Progress fill (past time) */}
          <div
            className="absolute left-0 top-0 h-full bg-[var(--color-accent)]/40 rounded-full transition-all duration-1000"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Hour markers */}
        <div className="absolute left-4 right-4 top-0 bottom-0">
          {hourMarkers.map((hour) => {
            const position = (hour / 24) * 100;
            const isPast = hour <= hours;
            const isCurrent = hour === hours;

            return (
              <div
                key={hour}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-end"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                {/* Hour tick */}
                <div
                  className={`w-px h-2 mb-0.5 ${
                    isPast
                      ? 'bg-[var(--color-accent)]/50'
                      : 'bg-[var(--color-text-secondary)]/30'
                  }`}
                />
                {/* Hour label */}
                <span
                  className={`text-[9px] ${
                    isCurrent
                      ? 'text-[var(--color-accent)] font-medium'
                      : isPast
                      ? 'text-[var(--color-text-secondary)]/60'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {formatHour(hour === 24 ? 0 : hour)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Event blocks */}
        <div className="absolute left-4 right-4 top-1 h-4">
          {todayEvents.map((event) => {
            const style = getEventStyle(event);
            const isPast = event.end < currentTime.getTime();

            return (
              <div
                key={event.id}
                className={`absolute h-full rounded-full flex items-center justify-center overflow-hidden text-[8px] font-medium px-1 ${
                  isPast
                    ? 'bg-[var(--color-text-secondary)]/20 text-[var(--color-text-secondary)]'
                    : 'bg-[var(--color-accent)]/30 text-[var(--color-accent)] border border-[var(--color-accent)]/50'
                }`}
                style={style}
                title={event.title}
              >
                <span className="truncate">{event.title}</span>
              </div>
            );
          })}
        </div>

        {/* Current time marker aligned to the track */}
        <div className="absolute left-4 right-4 top-0 bottom-0 pointer-events-none z-10">
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${clampedProgress}%`, transform: 'translateX(-50%)' }}
          >
            {/* Time badge */}
            <div className="bg-[var(--color-accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
              {formatTime(currentTime)}
            </div>
            {/* Marker line */}
            <div className="flex-1 w-0.5 bg-[var(--color-accent)] rounded-full" />
            {/* Marker dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] shadow-lg border-2 border-white" />
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="h-5 px-4 flex items-center justify-between border-t border-[var(--color-widget-border)]/50 bg-[var(--color-dashboard-bg)]/50">
        {/* Date */}
        <span className="text-[10px] text-[var(--color-text-secondary)]">
          {currentTime.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>

        {/* Progress and remaining */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--color-accent)]">
            {clampedProgress.toFixed(0)}% {t('timeline_of_day')}
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            {remainingHours}h {remainingMins}m {t('timeline_remaining')}
          </span>
        </div>
      </div>
    </div>
  );
}
