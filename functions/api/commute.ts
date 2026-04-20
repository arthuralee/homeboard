// Google Directions API proxy. Given an event location + arrival time,
// returns the first subway transit step plus overall duration. Keeps the
// API key and home origin server-side as CF Pages secrets.

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

  const arrivalUnix = Math.floor(new Date(arriveBy).getTime() / 1000);
  if (!Number.isFinite(arrivalUnix)) {
    return new Response('invalid arriveBy', { status: 400 });
  }

  const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
  directionsUrl.searchParams.set('origin', env.HOME_ORIGIN);
  directionsUrl.searchParams.set('destination', to);
  directionsUrl.searchParams.set('mode', 'transit');
  directionsUrl.searchParams.set('transit_mode', 'subway|train|bus');
  directionsUrl.searchParams.set('arrival_time', String(arrivalUnix));
  directionsUrl.searchParams.set('key', env.GOOGLE_MAPS_KEY);

  // Cache by destination + arriveBy rounded to 5min so identical lookups don't
  // re-bill the Directions API.
  const upstream = await fetch(directionsUrl.toString(), {
    cf: { cacheTtl: 300, cacheEverything: true },
  });

  if (!upstream.ok) {
    return new Response(`directions upstream ${upstream.status}`, { status: 502 });
  }

  const data = (await upstream.json()) as {
    status: string;
    error_message?: string;
    routes?: Array<{
      legs?: Array<{
        duration?: { value: number };
        departure_time?: { value: number; text: string };
        arrival_time?: { value: number; text: string };
        steps?: Array<{
          travel_mode: string;
          transit_details?: {
            line?: { short_name?: string; name?: string; vehicle?: { type?: string } };
            headsign?: string;
            departure_stop?: { name?: string };
            arrival_stop?: { name?: string };
            departure_time?: { value: number; text: string };
            arrival_time?: { value: number; text: string };
          };
        }>;
      }>;
    }>;
  };

  if (data.status !== 'OK') {
    return new Response(
      `directions status=${data.status}${data.error_message ? ' ' + data.error_message : ''}`,
      { status: 502 },
    );
  }

  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg) {
    return new Response('no route found', { status: 502 });
  }

  const subwayStep = leg.steps?.find(
    (s) =>
      s.travel_mode === 'TRANSIT' &&
      s.transit_details?.line?.vehicle?.type === 'SUBWAY',
  );

  const response: CommuteResponse = {
    totalMinutes: Math.round((leg.duration?.value ?? 0) / 60),
    departureTime: leg.departure_time
      ? new Date(leg.departure_time.value * 1000).toISOString()
      : '',
    arrivalTime: leg.arrival_time
      ? new Date(leg.arrival_time.value * 1000).toISOString()
      : '',
    firstTransit:
      subwayStep?.transit_details
        ? {
            station: subwayStep.transit_details.departure_stop?.name ?? '',
            arrivalStation: subwayStep.transit_details.arrival_stop?.name ?? '',
            line: subwayStep.transit_details.line?.short_name ?? '',
            headsign: subwayStep.transit_details.headsign ?? '',
            departureTime: subwayStep.transit_details.departure_time
              ? new Date(subwayStep.transit_details.departure_time.value * 1000).toISOString()
              : '',
            arrivalTime: subwayStep.transit_details.arrival_time
              ? new Date(subwayStep.transit_details.arrival_time.value * 1000).toISOString()
              : '',
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
