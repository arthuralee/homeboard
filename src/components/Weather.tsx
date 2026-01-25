import { useState, useEffect } from 'react';
import type { WeatherData } from '../types';

// Weather codes from Open-Meteo WMO codes
const weatherDescriptions: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear', icon: '☀️' },
  1: { label: 'Mostly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Icy Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌧️' },
  53: { label: 'Drizzle', icon: '🌧️' },
  55: { label: 'Heavy Drizzle', icon: '🌧️' },
  61: { label: 'Light Rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy Rain', icon: '🌧️' },
  66: { label: 'Freezing Rain', icon: '🌨️' },
  67: { label: 'Heavy Freezing Rain', icon: '🌨️' },
  71: { label: 'Light Snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy Snow', icon: '❄️' },
  77: { label: 'Snow Grains', icon: '❄️' },
  80: { label: 'Light Showers', icon: '🌦️' },
  81: { label: 'Showers', icon: '🌦️' },
  82: { label: 'Heavy Showers', icon: '🌧️' },
  85: { label: 'Snow Showers', icon: '🌨️' },
  86: { label: 'Heavy Snow Showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm w/ Hail', icon: '⛈️' },
  99: { label: 'Thunderstorm w/ Heavy Hail', icon: '⛈️' },
};

// Default to NYC coordinates
const NYC_LAT = 40.7128;
const NYC_LON = -74.006;

export function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${NYC_LAT}&longitude=${NYC_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
        );

        if (!response.ok) throw new Error('Failed to fetch weather');

        const data = await response.json();
        const current = data.current;

        setWeather({
          temperature: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation,
          windSpeed: Math.round(current.wind_speed_10m),
        });
        setError(null);
      } catch (err) {
        setError('Weather unavailable');
        console.error('Weather fetch error:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="text-gray-500 text-xl">
        {error}
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="text-gray-500 text-xl animate-pulse">
        Loading weather...
      </div>
    );
  }

  const weatherInfo = weatherDescriptions[weather.weatherCode] || { label: 'Unknown', icon: '❓' };

  return (
    <div className="flex items-center gap-4">
      <div className="text-5xl">
        {weatherInfo.icon}
      </div>
      <div className="text-right">
        <div className="text-4xl font-light text-white">
          {weather.temperature}°F
        </div>
        <div className="text-base text-gray-400">
          {weatherInfo.label} · Feels {weather.feelsLike}°
        </div>
      </div>
    </div>
  );
}
