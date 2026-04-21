export interface WeatherData {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  isDay: boolean;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  uvIndex: number;
  hourlyForecast: HourlyForecast[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
}
