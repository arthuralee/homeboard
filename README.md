# Homeboard

A glanceable at-a-distance dashboard designed for an iPad mounted in landscape mode. Shows real-time NYC subway arrivals and current weather.

## Features

- **Real-time Subway Arrivals**: Shows upcoming trains for configured stations using the official MTA API
- **Current Weather**: Temperature and conditions from Open-Meteo (no API key required)
- **Large, Readable Display**: Optimized for viewing from across a room
- **Fullscreen PWA**: Install as an app on your iPad for a clean, kiosk-like experience
- **Dark Theme**: Easy on the eyes, especially in dim lighting

## Setup

### 1. Get an MTA API Key

1. Visit [api.mta.info](https://api.mta.info/) and register for an account
2. Request an API key for the GTFS-RT feeds
3. You'll need this key for the Cloudflare deployment

### 2. Configure Your Stations

Edit `src/components/SubwayStatus.tsx` and update the `STATIONS` array with your nearby stations:

```typescript
const STATIONS: StationConfig[] = [
  { id: '635', name: '14 St-Union Sq', displayName: 'Union Square' },
  { id: '631', name: 'Astor Pl', displayName: 'Astor Place' },
];
```

Find station IDs in the [MTA Station data](https://atisdata.s3.amazonaws.com/Station/Stations.csv).

### 3. Deploy to Cloudflare Pages

#### Option A: Via Cloudflare Dashboard
1. Push this repo to GitHub
2. Go to Cloudflare Dashboard > Pages > Create a project
3. Connect your GitHub repo
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variable: `MTA_API_KEY` = your MTA API key
6. Deploy!

#### Option B: Via Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist
```

### 4. Install on iPad

1. Open the deployed URL in Safari on your iPad
2. Tap the Share button > "Add to Home Screen"
3. Open the app from your home screen
4. Tap the fullscreen button in the bottom right corner
5. Enable Guided Access (Settings > Accessibility > Guided Access) for true kiosk mode

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Weather Location

The weather defaults to NYC coordinates. To change, edit `src/components/Weather.tsx`:

```typescript
const NYC_LAT = 40.7128;  // Change to your latitude
const NYC_LON = -74.006;  // Change to your longitude
```

### Station Direction Labels

Customize uptown/downtown labels in `src/components/SubwayStatus.tsx` based on your location.

## Keeping the Screen On

To prevent the iPad from sleeping:
1. Settings > Display & Brightness > Auto-Lock > Never
2. Consider using Guided Access for additional lockdown
3. Keep the iPad plugged in

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Cloudflare Pages + Functions
- MTA GTFS-RT API
- Open-Meteo Weather API
