import { useState, useEffect } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { getLocale, useTranslation } from '../../i18n';

export function ClockWidget() {
  const { language } = useTranslation();
  const locale = getLocale(language);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <WidgetWrapper titleKey="widget_clock">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
          {formatTime(time)}
        </div>
        <div className="mt-4 text-xl text-[var(--color-text-secondary)]">
          {formatDate(time)}
        </div>
      </div>
    </WidgetWrapper>
  );
}
