import { useEffect, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import type { WeatherData } from '../../types';
import { getLocale, useTranslation } from '../../i18n';

const WEATHER_ICON: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  80: '🌧️',
  95: '⛈️',
};

function getWeatherIcon(code: number) {
  return WEATHER_ICON[code] || '🌡️';
}

export function WeatherWidget() {
  const { language, t } = useTranslation();
  const locale = getLocale(language);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchWeather() {
      try {
        const res = await fetch('/api/weather');
        if (!res.ok) throw new Error(t('weather_error'));
        const data = await res.json();
        if (mounted && data.weather) {
          setWeather(data.weather);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : t('weather_unknown_error'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_weather">
        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mr-3" />
          <span>{t('weather_loading')}</span>
        </div>
      </WidgetWrapper>
    );
  }

  if (error || !weather) {
    return (
      <WidgetWrapper titleKey="widget_weather">
        <div className="flex items-center justify-center h-full text-[var(--color-error)] text-sm">
          {error || t('weather_no_data')}
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper titleKey="widget_weather" noPadding>
      <div className="p-4 grid grid-cols-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{getWeatherIcon(weather.weatherCode)}</div>
          <div>
            <div className="text-3xl font-bold text-[var(--color-text-primary)]">
              {Math.round(weather.temperature)}°C
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {t('weather_feels_like')} {Math.round(weather.apparentTemperature)}°C · {t('weather_humidity')}{' '}
              {weather.humidity}%
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {t('weather_wind')} {Math.round(weather.windSpeed)} km/h
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {weather.daily.slice(0, 3).map((day) => {
            const date = new Date(day.date);
            return (
              <div
                key={day.date}
                className="p-3 rounded-lg bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-center"
              >
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit' })}
                </div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)]">
                  {t('weather_rain')} {day.precipProb ?? 0}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetWrapper>
  );
}
