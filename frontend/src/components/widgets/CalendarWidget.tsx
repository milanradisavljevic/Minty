import { useMemo, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { getLocale, useTranslation } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

function getWeekdayLabels(locale: string, weekStartsOn: 'monday' | 'sunday') {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const baseDate = new Date(Date.UTC(2024, 0, 7)); // Sunday
  const order = weekStartsOn === 'monday' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  return order.map((day) => {
    const date = new Date(baseDate);
    date.setUTCDate(baseDate.getUTCDate() + day);
    return formatter.format(date);
  });
}

function buildMonthDays(year: number, month: number, weekStartsOn: 'monday' | 'sunday') {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const firstWeekday = firstDay.getDay(); // 0 = Sunday
  const offset = weekStartsOn === 'monday' ? (firstWeekday + 6) % 7 : firstWeekday;
  const totalCells = Math.ceil((offset + totalDays) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length < totalCells) {
    cells.push(null);
  }
  return cells;
}

export function CalendarWidget() {
  const { language } = useTranslation();
  const locale = getLocale(language);
  const weekStartsOn = useSettingsStore((s) => s.calendar?.weekStartsOn ?? 'monday');
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale, weekStartsOn), [locale, weekStartsOn]);
  const days = useMemo(
    () => buildMonthDays(year, month, weekStartsOn),
    [year, month, weekStartsOn]
  );

  return (
    <WidgetWrapper titleKey="widget_calendar" noPadding>
      <div className="p-4 flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
          {weekdayLabels.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-8" />;
            }

            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();

            return (
              <div
                key={date.toISOString()}
                className={`h-8 flex items-center justify-center rounded-md text-sm ${
                  isToday
                    ? 'bg-[var(--color-accent)] text-white font-semibold'
                    : 'text-[var(--color-text-primary)]'
                }`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetWrapper>
  );
}
