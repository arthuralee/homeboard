import { useEffect, useState } from 'react';
import type { CalendarEvent } from './useCalendar';
import {
  GOOGLE_STATION_MAP,
  HEADSIGN_DIRECTION_RULES,
  COMMUTE_OUTBOUND_DIRECTION,
} from '../config/commute';

// Cache Directions responses in localStorage so page reloads (and the 5-min
// auto-refresh in App.tsx) don't re-hit the Function. TTL matches the edge
// cache on /api/commute.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_KEY_PREFIX = 'commute:v1:';

interface CachedEntry {
  expiresAt: number;
  data: RawCommuteResponse;
}

function cacheKey(to: string, arriveBy: string): string {
  return `${CACHE_KEY_PREFIX}${to}|${arriveBy}`;
}

function readCache(to: string, arriveBy: string): RawCommuteResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(to, arriveBy));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (Date.now() >= entry.expiresAt) {
      localStorage.removeItem(cacheKey(to, arriveBy));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(to: string, arriveBy: string, data: RawCommuteResponse): void {
  try {
    const entry: CachedEntry = { expiresAt: Date.now() + CACHE_TTL_MS, data };
    localStorage.setItem(cacheKey(to, arriveBy), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore, next load will retry
  }
}

interface RawCommuteResponse {
  totalMinutes: number;
  departureTime: string;
  arrivalTime: string;
  firstTransit: {
    station: string;
    arrivalStation: string;
    line: string;
    headsign: string;
    departureTime: string;
    arrivalTime: string;
  } | null;
}

export interface Commute {
  totalMinutes: number;
  departureTime: Date;
  arrivalTime: Date;
  transit: {
    stationId: string | null;
    displayName: string;
    googleStationName: string;
    line: string;
    direction: 'N' | 'S';
    headsign: string;
    trainDeparture: Date;
  } | null;
}

export interface UseCommuteResult {
  commute: Commute | null;
  loading: boolean;
  error: string | null;
}

function resolveDirection(line: string, headsign: string): 'N' | 'S' {
  const rule = HEADSIGN_DIRECTION_RULES.find(
    (r) => r.line === line && headsign.toLowerCase().includes(r.headsignContains.toLowerCase()),
  );
  return rule?.direction ?? COMMUTE_OUTBOUND_DIRECTION;
}

export function useCommute(event: CalendarEvent | undefined): UseCommuteResult {
  const [commute, setCommute] = useState<Commute | null>(null);
  const [loading, setLoading] = useState<boolean>(!!event);
  const [error, setError] = useState<string | null>(null);

  // Key the effect by the fields that actually matter so we don't re-fetch
  // on unrelated event re-renders.
  const to = event?.location ?? '';
  const arriveBy = event?.start.toISOString() ?? '';

  useEffect(() => {
    if (!to || !arriveBy) {
      setCommute(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const hydrate = (data: RawCommuteResponse) => {
      let transit: Commute['transit'] = null;
      if (data.firstTransit) {
        const ft = data.firstTransit;
        const mapped = GOOGLE_STATION_MAP[`${ft.station}|${ft.line}`];
        transit = {
          stationId: mapped?.stationId ?? null,
          displayName: mapped?.displayName ?? `${ft.station} (${ft.line})`,
          googleStationName: ft.station,
          line: ft.line,
          direction: resolveDirection(ft.line, ft.headsign),
          headsign: ft.headsign,
          trainDeparture: new Date(ft.departureTime),
        };
      }
      setCommute({
        totalMinutes: data.totalMinutes,
        departureTime: new Date(data.departureTime),
        arrivalTime: new Date(data.arrivalTime),
        transit,
      });
      setError(null);
    };

    const cached = readCache(to, arriveBy);
    if (cached) {
      hydrate(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    const run = async () => {
      try {
        const params = new URLSearchParams({ to, arriveBy });
        const res = await fetch(`/api/commute?${params.toString()}`);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`${res.status} ${body}`);
        }
        const data = (await res.json()) as RawCommuteResponse;
        if (cancelled) return;
        writeCache(to, arriveBy, data);
        hydrate(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Commute fetch error:', err);
        setError(err instanceof Error ? err.message : 'commute unavailable');
        setCommute(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [to, arriveBy]);

  return { commute, loading, error };
}
