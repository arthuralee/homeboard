import { useCallback, useEffect, useState } from 'react';
import { SubwayLine } from './SubwayLine';
import type { CalendarEvent } from '../hooks/useCalendar';
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

export function CommuteCard({ event }: CommuteCardProps) {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [subwayError, setSubwayError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const fetchArrivals = useCallback(async () => {
    try {
      const stationIds = COMMUTE_HOME_STATIONS.map((s) => s.id).join(',');
      const res = await fetch(`/api/subway?stations=${stationIds}`);
      if (!res.ok) throw new Error('subway fetch failed');
      const data = await res.json();
      setArrivals(data.arrivals || []);
      setSubwayError(null);
    } catch (err) {
      console.error('Subway fetch error:', err);
      setSubwayError('Subway data unavailable');
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
    const id = setInterval(fetchArrivals, 30_000);
    return () => clearInterval(id);
  }, [fetchArrivals]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const leaveBy = new Date(
    event.start.getTime() - (COMMUTE_TRAVEL_MINUTES + COMMUTE_BUFFER_MINUTES) * 60_000,
  );
  const leaveSoon = leaveBy.getTime() - now.getTime() < 15 * 60_000;

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
      </div>

      {/* Trains from home stations, outbound direction only */}
      <div className="flex-1 min-h-0">
        <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
          {COMMUTE_OUTBOUND_DIRECTION === 'N' ? 'Uptown' : 'Downtown'} trains
        </div>
        {subwayError ? (
          <div className="text-gray-500 text-lg">{subwayError}</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {COMMUTE_HOME_STATIONS.map((station) => {
              const stationArrivals = arrivals
                .filter(
                  (a) =>
                    a.stationId === station.id &&
                    a.direction === COMMUTE_OUTBOUND_DIRECTION &&
                    new Date(a.arrivalTime).getTime() > now.getTime(),
                )
                .sort(
                  (a, b) =>
                    new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime(),
                )
                .slice(0, 3);

              return (
                <div key={station.id} className="min-w-0">
                  <div className="text-base text-gray-400 mb-1 truncate">{station.displayName}</div>
                  {stationArrivals.length === 0 ? (
                    <div className="text-gray-600 text-lg">No trains</div>
                  ) : (
                    <div className="space-y-1">
                      {stationArrivals.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <SubwayLine line={a.routeId} size="md" />
                          <span className="text-2xl font-semibold text-white tabular-nums">
                            {formatArrival(a.arrivalTime, now)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
