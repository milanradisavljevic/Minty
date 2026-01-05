import type { WeatherData, DailyForecast } from '../types';

interface WeatherApiResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

function mapDaily(data: WeatherApiResponse): DailyForecast[] {
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

export async function fetchWeatherData({
  latitude,
  longitude,
  units = 'metric',
  signal,
}: {
  latitude: number;
  longitude: number;
  units?: 'metric' | 'imperial';
  signal?: AbortSignal;
}): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');
  if (units === 'imperial') {
    url.searchParams.set('temperature_unit', 'fahrenheit');
  }

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload: WeatherApiResponse = await response.json();
  const current = payload?.current;

  if (!current) {
    throw new Error('Weather data missing');
  }

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    updatedAt: Date.now(),
    daily: mapDaily(payload),
  };
}
