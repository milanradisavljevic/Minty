import { getConfig } from './configService.js';
import type { WeatherData, DailyForecast } from '../../../shared/types/index.js';

interface WeatherCache {
  data: WeatherData;
  fetchedAt: number;
}

let cache: WeatherCache | null = null;

function mapDaily(data: any): DailyForecast[] {
  const dates: string[] = data.daily.time || [];
  const max: number[] = data.daily.temperature_2m_max || [];
  const min: number[] = data.daily.temperature_2m_min || [];
  const precip: number[] = data.daily.precipitation_probability_max || [];

  return dates.map((date, index) => ({
    date,
    tempMax: max[index],
    tempMin: min[index],
    precipProb: precip[index],
  }));
}

export async function getWeather(): Promise<WeatherData> {
  const cfg = getConfig();
  const ttl = cfg.weather.updateInterval || 10 * 60 * 1000;
  const now = Date.now();

  if (cache && now - cache.fetchedAt < ttl) {
    return cache.data;
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', cfg.weather.latitude.toString());
  url.searchParams.set('longitude', cfg.weather.longitude.toString());
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  const payload: any = await response.json();
  const current = payload.current;

  const weather: WeatherData = {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    updatedAt: now,
    daily: mapDaily(payload),
  };

  cache = { data: weather, fetchedAt: now };
  return weather;
}
