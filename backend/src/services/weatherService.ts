import { getConfig } from './configService.js';
import type { WeatherData, DailyForecast } from '../../../shared/types/index.js';

interface WeatherCache {
  data: WeatherData;
  fetchedAt: number;
  lat: number;
  lon: number;
  units: UnitSystem;
}

let cache: WeatherCache | null = null;
const MIN_TTL = 30 * 60 * 1000; // 30 minutes
const STALE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

type UnitSystem = 'metric' | 'imperial';

function mapDaily(data: any): DailyForecast[] {
  const dates: string[] = data.daily?.time || [];
  const max: number[] = data.daily?.temperature_2m_max || [];
  const min: number[] = data.daily?.temperature_2m_min || [];
  const precip: number[] = data.daily?.precipitation_probability_max || [];

  return dates.map((date, index) => ({
    date,
    tempMax: max[index],
    tempMin: min[index],
    precipProb: precip[index],
  }));
}

// WMO Weather interpretation codes (WW)
// See: https://www.noaa.gov/weather
function wmoCodeToSimple(wmoCode: number): number {
  if (wmoCode === 0) return 800; // Clear
  if (wmoCode <= 3) return 801; // Partly cloudy
  if (wmoCode <= 48) return 741; // Fog
  if (wmoCode <= 67) return 500; // Drizzle/Rain
  if (wmoCode <= 77) return 600; // Snow
  if (wmoCode <= 82) return 521; // Showers
  if (wmoCode <= 86) return 621; // Snow showers
  if (wmoCode <= 99) return 200; // Thunderstorm
  return 803; // Cloudy
}

async function fetchFromOpenMeteo(lat: number, lon: number, units: UnitSystem): Promise<WeatherData> {
  const useImperial = units === 'imperial';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('temperature_unit', useImperial ? 'fahrenheit' : 'celsius');
  url.searchParams.set('windspeed_unit', useImperial ? 'mph' : 'kmh');
  url.searchParams.set('precipitation_unit', useImperial ? 'inch' : 'mm');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo failed: ${response.status}`);
  }

  const payload: any = await response.json();

  if (payload.error) {
    throw new Error(payload.reason || 'Open-Meteo API error');
  }

  const current = payload.current;
  const now = Date.now();

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    updatedAt: now,
    daily: mapDaily(payload),
  };
}

async function fetchFromWttr(lat: number, lon: number, units: UnitSystem): Promise<WeatherData> {
  // wttr.in uses location format, we'll use coordinates
  const url = `https://wttr.in/${lat},${lon}?format=j1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'UltrawideDashboard/1.0' }
  });

  if (!response.ok) {
    throw new Error(`wttr.in failed: ${response.status}`);
  }

  const data: any = await response.json();
  const current = data.current_condition?.[0];
  const forecast = data.weather || [];

  if (!current) {
    throw new Error('wttr.in returned no current conditions');
  }

  const now = Date.now();

  // Map wttr.in weather codes to Open-Meteo style codes
  const weatherCode = parseInt(current.weatherCode) || 0;

  // Build daily forecast
  const daily: DailyForecast[] = forecast.slice(0, 7).map((day: any) => ({
    date: day.date || '',
    tempMax: parseFloat(day.maxtempC) || 0,
    tempMin: parseFloat(day.mintempC) || 0,
    precipProb: parseFloat(day.hourly?.[0]?.chanceofrain || day.hourly?.[0]?.chanceofsnow || 0),
  }));

  const metricWeather: WeatherData = {
    temperature: parseFloat(current.temp_C) || 0,
    apparentTemperature: parseFloat(current.FeelsLikeC) || 0,
    humidity: parseFloat(current.humidity) || 0,
    windSpeed: parseFloat(current.windspeedKmph) || 0,
    weatherCode: wmoCodeToSimple(weatherCode),
    updatedAt: now,
    daily,
  };

  if (units === 'imperial') {
    const toF = (c: number) => (c * 9) / 5 + 32;
    const toMph = (kmh: number) => kmh * 0.621371;
    return {
      ...metricWeather,
      temperature: toF(metricWeather.temperature),
      apparentTemperature: toF(metricWeather.apparentTemperature),
      windSpeed: toMph(metricWeather.windSpeed),
    };
  }

  return metricWeather;
}

export async function getWeather(options?: { latitude?: number; longitude?: number; units?: UnitSystem }): Promise<WeatherData> {
  const cfg = getConfig();
  const ttl = Math.max(MIN_TTL, cfg.weather.updateInterval || MIN_TTL);
  const now = Date.now();

  // Return fresh cache if available
  if (
    cache &&
    now - cache.fetchedAt < ttl &&
    cache.lat === (options?.latitude ?? cfg.weather.latitude) &&
    cache.lon === (options?.longitude ?? cfg.weather.longitude) &&
    cache.units === (options?.units ?? cfg.weather.units ?? 'metric')
  ) {
    return cache.data;
  }

  const lat = options?.latitude ?? cfg.weather.latitude;
  const lon = options?.longitude ?? cfg.weather.longitude;
  const units: UnitSystem = options?.units ?? cfg.weather.units ?? 'metric';

  // Try Open-Meteo first
  try {
    const weather = await fetchFromOpenMeteo(lat, lon, units);
    cache = { data: weather, fetchedAt: now, lat, lon, units };
    return weather;
  } catch (error: any) {
    console.warn('[Weather] Open-Meteo failed:', error.message);

    // Try wttr.in as fallback
    try {
      const weather = await fetchFromWttr(lat, lon, units);
      cache = { data: weather, fetchedAt: now, lat, lon, units };
      return weather;
    } catch (fallbackError: any) {
      console.error('[Weather] wttr.in fallback failed:', fallbackError.message);

      // If we have stale cache, return it rather than failing completely
      if (cache && now - cache.fetchedAt < STALE_CACHE_MAX_AGE) {
        console.warn('[Weather] Returning stale cache (age:', Math.round((now - cache.fetchedAt) / 60000), 'minutes)');
        return cache.data;
      }

      throw new Error('All weather services failed');
    }
  }
}
