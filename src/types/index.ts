export interface SubwayArrival {
  routeId: string;
  direction: 'N' | 'S';
  arrivalTime: Date;
  stationName: string;
}

export interface SubwayStation {
  id: string;
  name: string;
  lines: string[];
}

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

export interface SubwayFeedResponse {
  arrivals: {
    routeId: string;
    direction: string;
    arrivalTime: string;
    stationId: string;
  }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
}

export interface CalendarFeedResponse {
  events: CalendarEvent[];
  error?: string;
}
