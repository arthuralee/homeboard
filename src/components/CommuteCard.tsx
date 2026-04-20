import { useCallback, useEffect, useState } from 'react';
import { SubwayLine } from './SubwayLine';
import type { CalendarEvent } from '../hooks/useCalendar';
import { useCommute } from '../hooks/useCommute';
import {
  COMMUTE_BUFFER_MINUTES,
  COMMUTE_HOME_STATIONS,
  COMMUTE_OUTBOUND_DIRECTION,
  COMMUTE_TRAVEL_MINUTES,
} from '../config/commute';

interface Arrival {
  routeId: string;
  direction: string;
  arrivalTime: string;
  stationId: string;
}

interface CommuteCardProps {
  event: CalendarEvent;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins <= 0) return 'now';
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatArrival(arrivalTime: string, now: Date): string {
  const diffMins = Math.floor((new Date(arrivalTime).getTime() - now.getTime()) / 60000);
  if (diffMins <= 0) return 'now';
  if (diffMins === 1) return '1 min';
  return `${diffMins} min`;
}

function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useSubwayArrivals(stationIds: string[]): { arrivals: Arrival[]; error: string | null } {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [error, setError] = useState<string | null>(null);

  const key = stationIds.join(',');
  const fetchArrivals = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`/api/subway?stations=${key}`);
      if (!res.ok) throw new Error('subway fetch failed');
      const data = await res.json();
      setArrivals(data.arrivals || []);
      setError(null);
    } catch (err) {
      console.error('Subway fetch error:', err);
      setError('Subway data unavailable');
    }
  }, [key]);

  useEffect(() => {
    fetchArrivals();
    const id = setInterval(fetchArrivals, 30_000);
    return () => clearInterval(id);
  }, [fetchArrivals]);

  return { arrivals, error };
}

export function CommuteCard({ event }: CommuteCardProps) {
  const now = useNow();
  const { commute, loading: commuteLoading, error: commuteError } = useCommute(event);

  // Pick the stations to query for live arrivals: the recommended one if we
  // can map it, otherwise all three home stations as a fallback.
  const recommendedStationId = commute?.transit?.stationId ?? null;
  const stationsToQuery = recommendedStationId
    ? [recommendedStationId]
    : COMMUTE_HOME_STATIONS.map((s) => s.id);

  const { arrivals, error: subwayError } = useSubwayArrivals(stationsToQuery);

  // Leave-by: prefer Google's recommended departure. Fall back to a static
  // estimate if commute data isn't available.
  const leaveBy = commute?.departureTime
    ?? new Date(
      event.start.getTime() - (COMMUTE_TRAVEL_MINUTES + COMMUTE_BUFFER_MINUTES) * 60_000,
    );
  const leaveSoon = leaveBy.getTime() - now.getTime() < 15 * 60_000;

  const transit = commute?.transit ?? null;
  const transitDirection = transit?.direction ?? COMMUTE_OUTBOUND_DIRECTION;

  // Arrivals filtered to the recommended line + direction when we have one,
  // otherwise just outbound across the fallback stations.
  const filteredArrivals = arrivals
    .filter((a) => {
      if (transit) {
        return (
          a.stationId === transit.stationId &&
          a.routeId === transit.line &&
          a.direction === transit.direction
        );
      }
      return a.direction === COMMUTE_OUTBOUND_DIRECTION;
    })
    .filter((a) => new Date(a.arrivalTime).getTime() > now.getTime())
    .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime())
    .slice(0, 4);

  return (
    <div className="h-full flex flex-col">
      {/* Event header */}
      <div className="flex-shrink-0 mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Up next</div>
        <div className="text-4xl font-bold text-white leading-tight truncate">{event.summary}</div>
        {event.location && (
          <div className="text-xl text-gray-300 mt-1 truncate">{event.location}</div>
        )}
        <div className="text-lg text-gray-400 mt-1">
          {formatTime(event.start)} · in {formatCountdown(event.start, now)}
          {commute && <> · {commute.totalMinutes}-min trip</>}
        </div>
      </div>

      {/* Leave-by banner */}
      <div
        className={`flex-shrink-0 rounded-xl p-4 mb-4 ${
          leaveSoon ? 'bg-amber-900/40 border border-amber-700/50' : 'bg-gray-900/40'
        }`}
      >
        <div className="text-sm text-gray-400 uppercase tracking-wider">Leave by</div>
        <div className="flex items-baseline gap-4 mt-1">
          <div className="text-5xl font-bold tabular-nums text-white">{formatTime(leaveBy)}</div>
          <div className={`text-2xl ${leaveSoon ? 'text-amber-300' : 'text-gray-400'}`}>
            {formatCountdown(leaveBy, now)}
          </div>
        </div>
        {commuteError && (
          <div className="text-xs text-gray-500 mt-2">
            Using static estimate (commute lookup: {commuteError})
          </div>
        )}
        {commuteLoading && !commute && (
          <div className="text-xs text-gray-500 mt-2">Looking up route…</div>
        )}
      </div>

      {/* Recommended route + live arrivals */}
      <div className="flex-1 min-h-0">
        {transit ? (
          <>
            <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
              {transit.displayName} · toward {transit.headsign}
            </div>
            {transit.stationId === null && (
              <div className="text-sm text-gray-500 mb-2">
                No live-arrivals mapping for "{transit.googleStationName}" — add it to
                GOOGLE_STATION_MAP.
              </div>
            )}
            {subwayError ? (
              <div className="text-gray-500 text-lg">{subwayError}</div>
            ) : filteredArrivals.length === 0 ? (
              <div className="text-gray-500 text-lg">No upcoming trains</div>
            ) : (
              <div className="space-y-2">
                {filteredArrivals.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <SubwayLine line={a.routeId} size="lg" />
                    <span className="text-4xl font-semibold text-white tabular-nums">
                      {formatArrival(a.arrivalTime, now)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
              {transitDirection === 'N' ? 'Uptown' : 'Downtown'} trains (fallback)
            </div>
            {subwayError ? (
              <div className="text-gray-500 text-lg">{subwayError}</div>
            ) : filteredArrivals.length === 0 ? (
              <div className="text-gray-500 text-lg">No upcoming trains</div>
            ) : (
              <div className="space-y-2">
                {filteredArrivals.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <SubwayLine line={a.routeId} size="md" />
                    <span className="text-3xl font-semibold text-white tabular-nums">
                      {formatArrival(a.arrivalTime, now)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
