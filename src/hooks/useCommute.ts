import { useEffect, useState } from 'react';
import type { CalendarEvent } from './useCalendar';
import {
  GOOGLE_STATION_MAP,
  HEADSIGN_DIRECTION_RULES,
  COMMUTE_OUTBOUND_DIRECTION,
  COMMUTE_MAX_HOURS_AHEAD,
} from '../config/commute';

// Passed as ?v= on the fetch URL to bust the CF edge cache when the
// request/response shape changes.
const COMMUTE_CACHE_VERSION = 2;


interface RawTransitOption {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
  walkToStationMinutes: number;
  transferCount: number;
  transit: {
    station: string;
    arrivalStation: string;
    line: string;
    headsign: string;
    departureTime: string;
    arrivalTime: string;
  };
}

interface RawSimpleOption {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
}

interface RawCommuteResponse {
  walk: RawSimpleOption | null;
  transit: RawTransitOption[];
  drive: RawSimpleOption | null;
  errors: { walk?: string; transit?: string; drive?: string };
}

export interface WalkOption {
  kind: 'walk';
  totalMinutes: number;
  departureTime: Date;
}

export interface DriveOption {
  kind: 'drive';
  totalMinutes: number;
  departureTime: Date;
}

export interface TransitOption {
  kind: 'transit';
  totalMinutes: number;
  departureTime: Date;
  walkToStationMinutes: number;
  transferCount: number;
  transit: {
    stationId: string | null;
    displayName: string;
    googleStationName: string;
    line: string;
    direction: 'N' | 'S';
    headsign: string;
    trainDeparture: Date;
  };
}

export type CommuteOption = WalkOption | TransitOption | DriveOption;

export interface UseCommuteResult {
  options: CommuteOption[];
  /** True when event exists but is too far out to compute a commute. */
  farAway: boolean;
  loading: boolean;
  error: string | null;
}

function resolveDirection(line: string, headsign: string): 'N' | 'S' {
  const rule = HEADSIGN_DIRECTION_RULES.find(
    (r) => r.line === line && headsign.toLowerCase().includes(r.headsignContains.toLowerCase()),
  );
  return rule?.direction ?? COMMUTE_OUTBOUND_DIRECTION;
}

function hydrate(raw: RawCommuteResponse): CommuteOption[] {
  const out: CommuteOption[] = [];
  if (raw.walk) {
    out.push({
      kind: 'walk',
      totalMinutes: raw.walk.totalMinutes,
      departureTime: new Date(raw.walk.departureTime),
    });
  }
  for (const t of raw.transit) {
    const mapped = GOOGLE_STATION_MAP[`${t.transit.station}|${t.transit.line}`];
    out.push({
      kind: 'transit',
      totalMinutes: t.totalMinutes,
      departureTime: new Date(t.departureTime),
      walkToStationMinutes: t.walkToStationMinutes,
      transferCount: t.transferCount,
      transit: {
        stationId: mapped?.stationId ?? null,
        displayName: mapped?.displayName ?? `${t.transit.station} (${t.transit.line})`,
        googleStationName: t.transit.station,
        line: t.transit.line,
        direction: resolveDirection(t.transit.line, t.transit.headsign),
        headsign: t.transit.headsign,
        trainDeparture: new Date(t.transit.departureTime),
      },
    });
  }
  if (raw.drive) {
    out.push({
      kind: 'drive',
      totalMinutes: raw.drive.totalMinutes,
      departureTime: new Date(raw.drive.departureTime),
    });
  }
  return out.sort((a, b) => a.totalMinutes - b.totalMinutes);
}

export function useCommute(event: CalendarEvent | undefined): UseCommuteResult {
  const [options, setOptions] = useState<CommuteOption[]>([]);
  const [loading, setLoading] = useState<boolean>(!!event);
  const [error, setError] = useState<string | null>(null);
  const [farAway, setFarAway] = useState<boolean>(false);

  const to = event?.location ?? '';
  const arriveBy = event?.start.toISOString() ?? '';

  useEffect(() => {
    if (!to || !arriveBy) {
      setOptions([]);
      setFarAway(false);
      setLoading(false);
      return;
    }

    const hoursUntil = (new Date(arriveBy).getTime() - Date.now()) / 3_600_000;
    if (hoursUntil > COMMUTE_MAX_HOURS_AHEAD) {
      setOptions([]);
      setFarAway(true);
      setLoading(false);
      return;
    }

    setFarAway(false);
    setLoading(true);
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams({ to, arriveBy, v: String(COMMUTE_CACHE_VERSION) });
        const res = await fetch(`/api/commute?${params.toString()}`);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`${res.status} ${body}`);
        }
        const data = (await res.json()) as RawCommuteResponse;
        if (cancelled) return;
        setOptions(hydrate(data));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('Commute fetch error:', err);
        setError(err instanceof Error ? err.message : 'commute unavailable');
        setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [to, arriveBy]);

  return { options, farAway, loading, error };
}
