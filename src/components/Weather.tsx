import { useState, useEffect, useRef } from 'react';
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
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${NYC_LAT}&longitude=${NYC_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=2&timezone=${encodeURIComponent(timezone)}`
        );

        if (!response.ok) throw new Error('Failed to fetch weather');

        const data = await response.json();
        const current = data.current;

        const now = new Date();
        now.setMinutes(0, 0, 0);

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
          uvIndex: Math.round(current.uv_index),
          hourlyForecast,
        });
        setError(null);
      } catch (err) {
        setError('Weather unavailable');
        console.error('Weather fetch error:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="text-gray-300 text-3xl">{error}</div>;
  }

  if (!weather) {
    return <div className="text-gray-300 text-3xl animate-pulse">Loading weather...</div>;
  }

  const weatherInfo = weatherDescriptions[weather.weatherCode] || { label: 'Unknown', icon: '❓' };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-6xl leading-none">{weatherInfo.icon}</div>
        <div>
          <div className="flex items-baseline gap-4">
            <div className="text-6xl font-semibold text-white tracking-tight leading-none">
              {weather.temperature}°
            </div>
            <div className="text-2xl font-semibold leading-none">
              <span className="text-gray-400">Feels </span>
              <span className="text-white">{weather.feelsLike}°</span>
            </div>
          </div>
          <div className="text-xl font-medium text-gray-200 mt-1">{weatherInfo.label}</div>
        </div>
      </div>

      <div className="flex gap-6 text-2xl font-semibold mb-5 whitespace-nowrap">
        <div>
          <span className="text-gray-400">Wind </span>
          <span className="text-white">{weather.windSpeed} mph</span>
        </div>
        <div>
          <span className="text-gray-400">UV </span>
          <span className="text-white">{weather.uvIndex}</span>
        </div>
      </div>

      {weather.hourlyForecast.length > 1 && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="text-lg text-gray-300 uppercase tracking-wide font-semibold mb-2">
            Next {weather.hourlyForecast.length} Hours
          </div>
          <div className="flex-1 min-h-0">
            <HourlyLineChart hours={weather.hourlyForecast} />
          </div>
        </div>
      )}
    </div>
  );
}

function HourlyLineChart({ hours }: { hours: HourlyForecast[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 600, h: 180 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const temps = hours.map((h) => h.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  const minIdx = temps.indexOf(minTemp);
  const maxIdx = temps.lastIndexOf(maxTemp);

  const vbWidth = size.w;
  const vbHeight = size.h;
  const iconRow = vbHeight * 0.11;
  const chartBottom = vbHeight * 0.78;
  const axisRow = vbHeight * 0.95;
  const padX = 32;
  const chartHeight = vbHeight * 0.46;
  const yPad = vbHeight * 0.12;

  const points = hours.map((h, i) => {
    const x = padX + (i / (hours.length - 1)) * (vbWidth - padX * 2);
    const normalized = (h.temperature - minTemp) / tempRange;
    const y = chartBottom - yPad - normalized * (chartHeight - yPad * 2);
    return { x, y, temp: h.temperature, time: h.time };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;

  const gradientId = 'weatherLineGradient';
  const fillId = 'weatherAreaGradient';

  return (
    <div ref={containerRef} className="w-full h-full">
    <svg
      viewBox={`0 0 ${vbWidth} ${vbHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#a5f3fc" />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {points.map((p, i) => {
        const icon = weatherDescriptions[hours[i].weatherCode]?.icon ?? '❓';
        return (
          <text key={`icon-${i}`} x={p.x} y={iconRow} textAnchor="middle" fontSize="18">
            {icon}
          </text>
        );
      })}

      <path d={areaPath} fill={`url(#${fillId})`} />

      <path
        d={linePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <TempMarker point={points[maxIdx]} label="H" stroke="#a5f3fc" above />
      {minIdx !== maxIdx && <TempMarker point={points[minIdx]} label="L" stroke="#93c5fd" />}

      {axisTicks(hours.length).map((i) => (
        <text
          key={`tick-${i}`}
          x={points[i].x}
          y={axisRow}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#d1d5db"
        >
          {formatHour(hours[i].time)}
        </text>
      ))}
    </svg>
    </div>
  );
}

function TempMarker({
  point,
  label,
  stroke,
  above,
}: {
  point: { x: number; y: number; temp: number };
  label: string;
  stroke: string;
  above?: boolean;
}) {
  return (
    <>
      <circle cx={point.x} cy={point.y} r="5" fill="#0f172a" stroke={stroke} strokeWidth="2.5" />
      <text
        x={point.x}
        y={point.y + (above ? -12 : 20)}
        textAnchor="middle"
        fontSize="15"
        fill="#ffffff"
        fontWeight="700"
      >
        {label} {point.temp}°
      </text>
    </>
  );
}

function axisTicks(n: number): number[] {
  if (n <= 1) return [0];
  if (n <= 3) return [0, n - 1];
  return [0, Math.floor((n - 1) / 2), n - 1];
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const tension = 0.5;
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}
