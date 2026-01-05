import { useEffect, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import type { WeatherData } from '../../types';
import { getLocale, useTranslation } from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';

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
  const weatherSettings = useSettingsStore((s) => s.weather);
  const unitLabel = weatherSettings?.units === 'imperial' ? '°F' : '°C';
  const locationName = weatherSettings?.locationName?.trim();
  const latitude = weatherSettings?.latitude ?? 48.2082;
  const longitude = weatherSettings?.longitude ?? 16.3738;
  const locationLabel = locationName || t('weather_location_missing');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const errorPrefix = t('weather_error');
  const unknownError = t('weather_unknown_error');

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const retryDelays = [1, 5, 15, 30].map((m) => m * 60 * 1000); // minutes to ms
    let failureCount = 0;
    let timeoutId: number | null = null;

    const scheduleNext = (delay: number) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(runFetch, delay);
    };

    const runFetch = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
          units: weatherSettings?.units ?? 'metric',
        });
        const res = await fetch(`/api/weather?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!mounted) return;
        const weatherData: WeatherData | undefined = data?.weather;
        if (!weatherData) throw new Error('No data');
        setWeather(weatherData);
        setError(null);
        failureCount = 0;
        scheduleNext(30 * 60 * 1000); // 30 minutes
      } catch (err) {
        if (!mounted || (err instanceof DOMException && err.name === 'AbortError')) return;
        const message = err instanceof Error ? err.message : unknownError;
        setError(`${errorPrefix}: ${message}`);
        failureCount = Math.min(failureCount + 1, retryDelays.length - 1);
        scheduleNext(retryDelays[failureCount]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    runFetch();

    return () => {
      mounted = false;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [latitude, longitude, weatherSettings?.units, language, errorPrefix, unknownError]);

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
              {Math.round(weather.temperature)}
              {unitLabel}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {t('weather_feels_like')} {Math.round(weather.apparentTemperature)}
              {unitLabel} · {t('weather_humidity')}{' '}
              {weather.humidity}%
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {t('weather_wind')} {Math.round(weather.windSpeed)} km/h
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">{locationLabel}</div>
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
