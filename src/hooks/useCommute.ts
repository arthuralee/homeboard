import { useEffect, useState } from 'react';
import type { CalendarEvent } from './useCalendar';
import {
  GOOGLE_STATION_MAP,
  HEADSIGN_DIRECTION_RULES,
  COMMUTE_OUTBOUND_DIRECTION,
} from '../config/commute';

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
