# Homeboard

A glanceable at-a-distance dashboard designed for an iPad mounted in landscape mode. Shows your next commute (with live NYC subway arrivals), current weather, and nearby Citibike availability.

## Features

- **Next Commute**: Shows your next calendar event with a location plus the best walk/drive/transit options. Transit options include live MTA arrival times.
- **Current Weather**: Temperature and conditions from Open-Meteo (no API key required)
- **Citibike Availability**: Bikes and e-bikes at a nearby dock
- **Large, Readable Display**: Optimized for viewing from across a room
- **Fullscreen PWA**: Install as an app on your iPad for a clean, kiosk-like experience
- **Dark Theme**: Easy on the eyes, especially in dim lighting

## Setup

### 1. Deploy to Cloudflare Pages

#### Option A: Via Cloudflare Dashboard
1. Push this repo to GitHub
2. Go to Cloudflare Dashboard > Pages > Create a project
3. Connect your GitHub repo
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy!

#### Option B: Via Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist
```

### 2. Install on iPad

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

### Citibike Station

The Citibike widget looks up a station by the short name printed on the dock. Edit `src/components/Citibike.tsx` to change `STATION_SHORT_NAME`.

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
