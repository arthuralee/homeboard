import { useState, useEffect } from 'react';
import type { WeatherData, HourlyForecast } from '../types';

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
          `https://api.open-meteo.com/v1/forecast?latitude=${NYC_LAT}&longitude=${NYC_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=2`
        );

        if (!response.ok) throw new Error('Failed to fetch weather');

        const data = await response.json();
        const current = data.current;

        // Get hourly forecast starting from current hour for next 10 hours
        const now = new Date();
        now.setMinutes(0, 0, 0); // Round down to current hour

        const hourlyForecast: HourlyForecast[] = [];
        for (let i = 0; i < data.hourly.time.length && hourlyForecast.length < 10; i++) {
          const forecastTime = new Date(data.hourly.time[i]);
          if (forecastTime >= now) {
            hourlyForecast.push({
              time: data.hourly.time[i],
              temperature: Math.round(data.hourly.temperature_2m[i]),
              weatherCode: data.hourly.weather_code[i],
            });
          }
        }

        setWeather({
          temperature: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation,
          windSpeed: Math.round(current.wind_speed_10m),
          hourlyForecast,
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

  // Calculate temperature range for the forecast
  const temps = weather.hourlyForecast.map(h => h.temperature);
  const minTemp = Math.min(...temps, weather.temperature);
  const maxTemp = Math.max(...temps, weather.temperature);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="h-full flex flex-col">
      {/* Current Weather - Main Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">
          {weatherInfo.icon}
        </div>
        <div>
          <div className="text-7xl font-light text-white tracking-tight">
            {weather.temperature}°
          </div>
          <div className="text-lg text-gray-400 mt-1">
            {weatherInfo.label}
          </div>
        </div>
      </div>

      {/* Secondary Info */}
      <div className="flex gap-6 text-lg text-gray-400 mb-6">
        <div>
          <span className="text-gray-500">Feels like</span>{' '}
          <span className="text-white">{weather.feelsLike}°</span>
        </div>
        <div>
          <span className="text-gray-500">Wind</span>{' '}
          <span className="text-white">{weather.windSpeed} mph</span>
        </div>
      </div>

      {/* Hourly Forecast */}
      {weather.hourlyForecast.length > 0 && (
        <div className="flex-1 min-h-0">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
            Next 10 Hours
          </div>
          <div className="flex justify-between">
            {weather.hourlyForecast.map((hour, idx) => {
              const hourTime = new Date(hour.time);
              const hourLabel = hourTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true
              });
              const hourWeather = weatherDescriptions[hour.weatherCode] || { icon: '❓' };
              const barHeight = ((hour.temperature - minTemp) / tempRange) * 32 + 16;

              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{hourLabel}</div>
                  <div className="text-base mb-1">{hourWeather.icon}</div>
                  <div
                    className="w-5 bg-gradient-to-t from-blue-600 to-orange-400 rounded-t opacity-60 mb-1"
                    style={{ height: `${barHeight}px` }}
                  />
                  <div className="text-sm font-medium text-white">{hour.temperature}°</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
