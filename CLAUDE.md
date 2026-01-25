# Claude Rules for Homeboard

## Project Overview

Homeboard is a glanceable, at-a-distance dashboard designed for an iPad mounted in landscape mode. It displays real-time NYC subway arrivals and current weather in a large, readable format optimized for viewing from across a room.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages + Functions
- **APIs**:
  - MTA GTFS-RT API (public, no key required) for subway data
  - Open-Meteo API (public, no key required) for weather

## Project Structure

```
homeboard/
├── src/
│   ├── components/
│   │   ├── Clock.tsx          # Time display
│   │   ├── SubwayLine.tsx     # Individual subway line badge
│   │   ├── SubwayStatus.tsx   # Main subway arrivals component
│   │   └── Weather.tsx        # Weather display component
│   ├── types/index.ts         # TypeScript type definitions
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles (Tailwind)
├── functions/
│   └── api/subway.ts          # Cloudflare Function for MTA API proxy
├── public/
│   ├── icon.svg               # App icon
│   └── manifest.json          # PWA manifest
└── Configuration files (vite, tsconfig, wrangler, etc.)
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Key Configuration Points

### Subway Stations
Edit `src/components/SubwayStatus.tsx` - modify the `STATIONS` array with GTFS station IDs.

### Weather Location
Edit `src/components/Weather.tsx` - modify `NYC_LAT` and `NYC_LON` constants.

## Design Guidelines

- **Large, readable text**: All UI elements should be visible from across a room
- **Dark theme**: Optimized for dim lighting and always-on displays
- **Minimal interactions**: This is a "glanceable" dashboard, not an interactive app
- **PWA-ready**: Supports installation as a home screen app with fullscreen mode

## Deployment

Deployed via Cloudflare Pages. The `functions/` directory contains Cloudflare Functions that proxy the MTA API to avoid CORS issues.

## Important Notes

- The MTA API is public and requires no API key
- Weather data comes from Open-Meteo (free, no API key)
- The app is designed for iPad landscape orientation
- Keep screen always on: iPad Settings > Display & Brightness > Auto-Lock > Never
