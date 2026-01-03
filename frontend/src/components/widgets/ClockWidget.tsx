import { useState, useEffect } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { getLocale, useTranslation } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

export function ClockWidget() {
  const { language } = useTranslation();
  const locale = getLocale(language);
  const clockSettings = useSettingsStore((s) => s.clock);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    // Apply showSeconds setting
    if (clockSettings.showSeconds) {
      options.second = '2-digit';
    }

    // Apply timeFormat setting
    if (clockSettings.timeFormat === '12h') {
      options.hour12 = true;
    } else if (clockSettings.timeFormat === '24h') {
      options.hour12 = false;
    }
    // 'system' leaves hour12 undefined, using browser default

    return date.toLocaleTimeString(locale, options);
  };

  const formatDate = (date: Date) => {
    if (!clockSettings.showDate) {
      return null;
    }

    // Build date format options based on settings
    if (clockSettings.dateFormat === 'system' || clockSettings.dateFormat === 'long') {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: clockSettings.dateFormat === 'long' ? 'long' : '2-digit',
        day: 'numeric',
      };
      if (clockSettings.showWeekday) {
        options.weekday = clockSettings.weekdayFormat;
      }
      return date.toLocaleDateString(locale, options);
    }

    // Custom format handling (DMY, MDY, YMD)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    let weekdayStr = '';
    if (clockSettings.showWeekday) {
      weekdayStr = date.toLocaleDateString(locale, { weekday: clockSettings.weekdayFormat }) + ', ';
    }

    switch (clockSettings.dateFormat) {
      case 'DMY':
        return `${weekdayStr}${day}.${month}.${year}`;
      case 'MDY':
        return `${weekdayStr}${month}/${day}/${year}`;
      case 'YMD':
        return `${weekdayStr}${year}-${month}-${day}`;
      default:
        return `${weekdayStr}${day}.${month}.${year}`;
    }
  };

  const dateStr = formatDate(time);

  return (
    <WidgetWrapper titleKey="widget_clock">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
          {formatTime(time)}
        </div>
        {dateStr && (
          <div className="mt-4 text-xl text-[var(--color-text-secondary)]">
            {dateStr}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
