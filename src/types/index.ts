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
}

export interface SubwayFeedResponse {
  arrivals: {
    routeId: string;
    direction: string;
    arrivalTime: string;
    stationId: string;
  }[];
}
