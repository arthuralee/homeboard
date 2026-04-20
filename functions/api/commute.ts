// Google Routes API proxy. Given an event location + arrival time, returns
// the first subway transit step plus overall duration. Keeps the API key and
// home origin server-side as CF Pages secrets.

interface Env {
  GOOGLE_MAPS_KEY: string;
  HOME_ORIGIN: string;
}

interface CommuteStep {
  station: string;
  arrivalStation: string;
  line: string;
  headsign: string;
  departureTime: string;
  arrivalTime: string;
}

interface CommuteResponse {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
  firstTransit: CommuteStep | null;
}

interface RoutesApiResponse {
  error?: { code: number; message: string; status: string };
  routes?: Array<{
    duration?: string; // e.g. "1234s"
    legs?: Array<{
      steps?: Array<{
        travelMode?: string;
        transitDetails?: {
          stopDetails?: {
            arrivalStop?: { name?: string };
            departureStop?: { name?: string };
            arrivalTime?: string;
            departureTime?: string;
          };
          headsign?: string;
          transitLine?: {
            nameShort?: string;
            name?: string;
            vehicle?: { type?: string };
          };
        };
      }>;
    }>;
  }>;
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)s$/);
  return match ? parseInt(match[1], 10) : 0;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const to = url.searchParams.get('to');
  const arriveBy = url.searchParams.get('arriveBy');

  if (!to || !arriveBy) {
    return new Response('missing to/arriveBy query params', { status: 400 });
  }
  if (!env.GOOGLE_MAPS_KEY) {
    return new Response('GOOGLE_MAPS_KEY not configured', { status: 500 });
  }
  if (!env.HOME_ORIGIN) {
    return new Response('HOME_ORIGIN not configured', { status: 500 });
  }

  const arriveByDate = new Date(arriveBy);
  if (Number.isNaN(arriveByDate.getTime())) {
    return new Response('invalid arriveBy', { status: 400 });
  }

  const body = {
    origin: { address: env.HOME_ORIGIN },
    destination: { address: to },
    travelMode: 'TRANSIT',
    arrivalTime: arriveByDate.toISOString(),
    transitPreferences: {
      allowedTravelModes: ['SUBWAY', 'TRAIN', 'BUS'],
    },
  };

  const upstream = await fetch(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.GOOGLE_MAPS_KEY,
        'x-goog-fieldmask':
          'routes.duration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
      },
      body: JSON.stringify(body),
      cf: { cacheTtl: 300, cacheEverything: true },
    },
  );

  if (!upstream.ok) {
    const errBody = await upstream.text();
    return new Response(
      `routes upstream ${upstream.status} ${errBody.slice(0, 300)}`,
      { status: 502 },
    );
  }

  const data = (await upstream.json()) as RoutesApiResponse;
  if (data.error) {
    return new Response(
      `routes error ${data.error.status}: ${data.error.message}`,
      { status: 502 },
    );
  }

  const route = data.routes?.[0];
  if (!route) {
    return new Response('no route found', { status: 502 });
  }

  const totalSeconds = parseDurationSeconds(route.duration);
  const departureTime = new Date(arriveByDate.getTime() - totalSeconds * 1000);

  const steps = route.legs?.[0]?.steps ?? [];
  const subwayStep = steps.find(
    (s) => s.travelMode === 'TRANSIT' && s.transitDetails?.transitLine?.vehicle?.type === 'SUBWAY',
  );

  const response: CommuteResponse = {
    totalMinutes: Math.round(totalSeconds / 60),
    departureTime: departureTime.toISOString(),
    arrivalTime: arriveByDate.toISOString(),
    firstTransit: subwayStep?.transitDetails
      ? {
          station: subwayStep.transitDetails.stopDetails?.departureStop?.name ?? '',
          arrivalStation: subwayStep.transitDetails.stopDetails?.arrivalStop?.name ?? '',
          line: subwayStep.transitDetails.transitLine?.nameShort ?? '',
          headsign: subwayStep.transitDetails.headsign ?? '',
          departureTime: subwayStep.transitDetails.stopDetails?.departureTime ?? '',
          arrivalTime: subwayStep.transitDetails.stopDetails?.arrivalTime ?? '',
        }
      : null,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};
