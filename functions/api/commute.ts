// Google Routes API proxy. Fires three parallel requests (WALK, TRANSIT with
// subway-only alternatives, DRIVE with traffic) and returns a unified response
// with all viable options. Client sorts + renders. API key + home origin stay
// as CF Pages secrets.

interface Env {
  GOOGLE_MAPS_KEY: string;
  HOME_ORIGIN: string;
}

interface TransitStep {
  station: string;
  arrivalStation: string;
  line: string;
  headsign: string;
  departureTime: string;
  arrivalTime: string;
}

interface TransitOption {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
  walkToStationMinutes: number;
  transferCount: number;
  transit: TransitStep;
}

interface SimpleOption {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
}

interface CommuteResponse {
  walk: SimpleOption | null;
  transit: TransitOption[];
  drive: SimpleOption | null;
  errors: { walk?: string; transit?: string; drive?: string };
}

interface Route {
  duration?: string;
  legs?: Array<{
    steps?: Array<{
      travelMode?: string;
      staticDuration?: string;
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
}

interface RoutesApiResponse {
  error?: { code: number; message: string; status: string };
  routes?: Route[];
}

const MAX_TRANSIT_OPTIONS = 3;
// When asking for DRIVE traffic at a future arrival time, we need a
// departureTime. Use a rough estimate; the returned duration is what drives
// the UI's leave-by anyway.
const DRIVE_DEPARTURE_HEURISTIC_MS = 30 * 60 * 1000;

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)s$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Google returns e.g. "A Line", "1 Line", "N Line" in transitLine.nameShort;
// the MTA feed + our SubwayLine component use bare identifiers ("A", "1").
function normalizeLineName(nameShort: string | undefined): string {
  if (!nameShort) return '';
  return nameShort.replace(/\s*Line\s*$/i, '').trim();
}

async function callRoutes(
  apiKey: string,
  body: Record<string, unknown>,
  fieldMask: string,
): Promise<RoutesApiResponse | { _error: string }> {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
      'x-goog-fieldmask': fieldMask,
    },
    body: JSON.stringify(body),
    // Only cache successful responses; 4xx/5xx should retry fresh on the
    // next request so a transient misconfig doesn't stick around for 5 min.
    cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '400-599': 0 } },
  });
  if (!res.ok) {
    return { _error: `upstream ${res.status}: ${(await res.text()).slice(0, 1500)}` };
  }
  const data = (await res.json()) as RoutesApiResponse;
  if (data.error) {
    return { _error: `${data.error.status}: ${data.error.message}` };
  }
  return data;
}

function extractSimple(data: RoutesApiResponse, arriveByDate: Date): SimpleOption | null {
  const duration = parseDurationSeconds(data.routes?.[0]?.duration);
  if (!duration) return null;
  return {
    totalMinutes: Math.round(duration / 60),
    departureTime: new Date(arriveByDate.getTime() - duration * 1000).toISOString(),
    arrivalTime: arriveByDate.toISOString(),
  };
}

function extractTransitOptions(data: RoutesApiResponse, arriveByDate: Date): TransitOption[] {
  const raw: TransitOption[] = [];

  for (const route of data.routes ?? []) {
    const totalSeconds = parseDurationSeconds(route.duration);
    const steps = route.legs?.[0]?.steps ?? [];

    // Find the first transit step (subway specifically).
    const firstTransitIdx = steps.findIndex(
      (s) =>
        s.travelMode === 'TRANSIT' &&
        s.transitDetails?.transitLine?.vehicle?.type === 'SUBWAY',
    );
    if (firstTransitIdx === -1) continue;

    const boardingStep = steps[firstTransitIdx];
    const td = boardingStep.transitDetails;
    if (!td) continue;

    // Sum WALK steps preceding the first subway step.
    const walkToStationSeconds = steps
      .slice(0, firstTransitIdx)
      .filter((s) => s.travelMode === 'WALK')
      .reduce((acc, s) => acc + parseDurationSeconds(s.staticDuration), 0);

    // Transfers = number of TRANSIT steps minus 1 (counting any vehicle).
    const transitStepCount = steps.filter((s) => s.travelMode === 'TRANSIT').length;
    const transferCount = Math.max(0, transitStepCount - 1);

    raw.push({
      totalMinutes: Math.round(totalSeconds / 60),
      departureTime: new Date(arriveByDate.getTime() - totalSeconds * 1000).toISOString(),
      arrivalTime: arriveByDate.toISOString(),
      walkToStationMinutes: Math.round(walkToStationSeconds / 60),
      transferCount,
      transit: {
        station: td.stopDetails?.departureStop?.name ?? '',
        arrivalStation: td.stopDetails?.arrivalStop?.name ?? '',
        line: normalizeLineName(td.transitLine?.nameShort),
        headsign: td.headsign ?? '',
        departureTime: td.stopDetails?.departureTime ?? '',
        arrivalTime: td.stopDetails?.arrivalTime ?? '',
      },
    });
  }

  // De-dup by (station, line, headsign); keep fastest, tiebreak by fewer transfers.
  const bySig = new Map<string, TransitOption>();
  for (const opt of raw) {
    const sig = `${opt.transit.station}|${opt.transit.line}|${opt.transit.headsign}`;
    const existing = bySig.get(sig);
    if (
      !existing ||
      opt.totalMinutes < existing.totalMinutes ||
      (opt.totalMinutes === existing.totalMinutes && opt.transferCount < existing.transferCount)
    ) {
      bySig.set(sig, opt);
    }
  }

  return Array.from(bySig.values())
    .sort((a, b) => a.totalMinutes - b.totalMinutes || a.transferCount - b.transferCount)
    .slice(0, MAX_TRANSIT_OPTIONS);
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

  const origin = { address: env.HOME_ORIGIN };
  const destination = { address: to };

  // Drive needs a future departureTime (arrivalTime is transit-only). Use a
  // heuristic offset, clamped to strictly-future to avoid Routes API rejecting
  // past timestamps.
  const driveDepartureMs = Math.max(
    arriveByDate.getTime() - DRIVE_DEPARTURE_HEURISTIC_MS,
    Date.now() + 60_000,
  );

  const walkBody = {
    origin,
    destination,
    travelMode: 'WALK',
  };
  const transitBody = {
    origin,
    destination,
    travelMode: 'TRANSIT',
    arrivalTime: arriveByDate.toISOString(),
    computeAlternativeRoutes: true,
    transitPreferences: {
      allowedTravelModes: ['SUBWAY', 'TRAIN'],
    },
  };
  const driveBody = {
    origin,
    destination,
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    departureTime: new Date(driveDepartureMs).toISOString(),
  };

  const [walkRes, transitRes, driveRes] = await Promise.all([
    callRoutes(env.GOOGLE_MAPS_KEY, walkBody, 'routes.duration'),
    callRoutes(
      env.GOOGLE_MAPS_KEY,
      transitBody,
      'routes.duration,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails',
    ),
    callRoutes(env.GOOGLE_MAPS_KEY, driveBody, 'routes.duration'),
  ]);

  const errors: CommuteResponse['errors'] = {};
  const walk = '_error' in walkRes ? null : extractSimple(walkRes, arriveByDate);
  const drive = '_error' in driveRes ? null : extractSimple(driveRes, arriveByDate);
  const transit = '_error' in transitRes ? [] : extractTransitOptions(transitRes, arriveByDate);
  if ('_error' in walkRes) errors.walk = walkRes._error;
  if ('_error' in transitRes) errors.transit = transitRes._error;
  if ('_error' in driveRes) errors.drive = driveRes._error;

  const responseBody: CommuteResponse = { walk, transit, drive, errors };
  const anyError = Object.keys(errors).length > 0;
  return new Response(JSON.stringify(responseBody), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': anyError ? 'no-store' : 'public, max-age=300',
    },
  });
};
