import { useCallback, useEffect, useMemo, useState } from 'react';
import { SubwayLine } from './SubwayLine';
import type { CalendarEvent } from '../hooks/useCalendar';
import { useCommute, type TransitOption } from '../hooks/useCommute';
import { useNow } from '../hooks/useNow';

interface Arrival {
  routeId: string;
  direction: string;
  arrivalTime: string;
  stationId: string;
}

interface CommuteCardProps {
  event: CalendarEvent;
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatCountdown(target: Date, now: Date): string {
  const diffMins = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diffMins <= 0) return 'now';
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatLeaveBy(target: Date, now: Date): string {
  const diffMins = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diffMins <= 0) return 'Leave now';
  if (diffMins < 30) return `Leave in ${diffMins}m`;
  return `Leave at ${formatClockTime(target)}`;
}

function formatArrivalBadge(arrivalTime: string, now: Date): string {
  const diffMins = Math.floor((new Date(arrivalTime).getTime() - now.getTime()) / 60_000);
  if (diffMins <= 0) return 'now';
  return `${diffMins}m`;
}

function formatEventWhen(start: Date, now: Date): string {
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dayDiff = Math.round((startDay.getTime() - nowDay.getTime()) / 86_400_000);

  const timeStr = formatClockTime(start);
  if (dayDiff === 0) return `at ${timeStr}`;
  if (dayDiff === 1) return `tomorrow at ${timeStr}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = start.toLocaleDateString([], { weekday: 'long' });
    return `on ${weekday} at ${timeStr}`;
  }
  return `${start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function useSubwayArrivals(stationIds: string[]): { arrivals: Arrival[]; error: string | null } {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [error, setError] = useState<string | null>(null);

  const key = stationIds.join(',');
  const fetchArrivals = useCallback(async () => {
    if (!key) {
      setArrivals([]);
      return;
    }
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

function EventHeader({ event, now, subtle }: { event: CalendarEvent; now: Date; subtle?: boolean }) {
  const titleSize = subtle ? 'text-3xl' : 'text-2xl';
  return (
    <div className="flex-shrink-0">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        Up next{!subtle && ` · in ${formatCountdown(event.start, now)}`}
      </div>
      <div className={`${titleSize} font-bold text-white leading-tight truncate`}>
        {event.summary}
      </div>
      <div className="text-base text-gray-300 mt-0.5 truncate">
        {event.location ? `${event.location} · ` : ''}
        {subtle ? formatEventWhen(event.start, now) : formatClockTime(event.start)}
      </div>
    </div>
  );
}

function SimpleOptionBlock({
  emoji,
  label,
  subtitle,
  departureTime,
  now,
  dimmed,
}: {
  emoji: string;
  label: string;
  subtitle: string;
  departureTime: Date;
  now: Date;
  dimmed?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl bg-gray-900/40 p-3 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-3xl" aria-hidden>{emoji}</span>
        <div className="min-w-0">
          <div className="text-xl font-semibold text-white">{label}</div>
          <div className="text-sm text-gray-400">{subtitle}</div>
        </div>
      </div>
      {!dimmed && (
        <div className="text-sm text-gray-300 whitespace-nowrap">{formatLeaveBy(departureTime, now)}</div>
      )}
    </div>
  );
}

function WalkDuration({ minutes }: { minutes: number }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden>🚶</span>
      <span>{minutes}m</span>
    </span>
  );
}

function TransitBlock({
  option,
  arrivals,
  now,
}: {
  option: TransitOption;
  arrivals: Arrival[];
  now: Date;
}) {
  const upcoming = arrivals
    .filter(
      (a) =>
        a.stationId === option.transit.stationId &&
        a.routeId === option.transit.line &&
        a.direction === option.transit.direction &&
        new Date(a.arrivalTime).getTime() > now.getTime(),
    )
    .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime())
    .slice(0, 3);

  const summaryBits = [
    `${option.totalMinutes} min`,
    option.transferCount === 0 ? 'direct' : `${option.transferCount} transfer${option.transferCount > 1 ? 's' : ''}`,
  ];

  return (
    <div className="rounded-xl bg-gray-900/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SubwayLine line={option.transit.line} size="md" />
          <div className="min-w-0">
            <div className="text-xl font-semibold text-white truncate">
              {option.transit.displayName}
            </div>
            <div className="text-sm text-gray-400 truncate">toward {option.transit.headsign}</div>
          </div>
        </div>
        <div className="text-sm text-gray-300 whitespace-nowrap flex-shrink-0">
          {formatLeaveBy(option.departureTime, now)}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-base text-gray-200 flex-wrap">
        <WalkDuration minutes={option.walkToStationMinutes} />
        <span className="text-gray-500" aria-hidden>›</span>
        <SubwayLine line={option.transit.line} size="sm" />
        <span className="text-gray-500" aria-hidden>›</span>
        <WalkDuration minutes={option.walkFromStationMinutes} />
        <span className="text-sm text-gray-500 ml-1">· {summaryBits.join(' · ')}</span>
      </div>
      <div className="mt-1 text-base text-gray-200">
        {option.transit.stationId === null ? (
          <span className="text-gray-500">
            No live-arrivals mapping for "{option.transit.googleStationName}"
          </span>
        ) : upcoming.length === 0 ? (
          <span className="text-gray-500">No upcoming trains</span>
        ) : (
          <>Next: {upcoming.map((a) => formatArrivalBadge(a.arrivalTime, now)).join(' · ')}</>
        )}
      </div>
    </div>
  );
}

export function CommuteCard({ event }: CommuteCardProps) {
  const now = useNow(30_000);
  const { options, farAway, loading, error } = useCommute(event);

  const stationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of options) {
      if (o.kind === 'transit' && o.transit.stationId) {
        ids.add(o.transit.stationId);
      }
    }
    return Array.from(ids);
  }, [options]);

  const { arrivals, error: subwayError } = useSubwayArrivals(stationIds);

  if (farAway) {
    return (
      <div className="h-full flex flex-col">
        <EventHeader event={event} now={now} subtle />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <EventHeader event={event} now={now} />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {loading && options.length === 0 ? (
          <div className="text-gray-500 text-lg animate-pulse">Looking up routes…</div>
        ) : options.length === 0 ? (
          <div className="text-gray-500 text-lg">
            {error ? `No routes (${error})` : 'No routes available'}
          </div>
        ) : (
          <>
            {options.map((o, idx) => {
              if (o.kind === 'walk') {
                return (
                  <SimpleOptionBlock
                    key={idx}
                    emoji="🚶"
                    label="Walk"
                    subtitle={`${o.totalMinutes} min`}
                    departureTime={o.departureTime}
                    now={now}
                    dimmed={o.totalMinutes >= 30}
                  />
                );
              }
              if (o.kind === 'drive') {
                return (
                  <SimpleOptionBlock
                    key={idx}
                    emoji="🚗"
                    label="Car"
                    subtitle={`${o.totalMinutes} min with traffic`}
                    departureTime={o.departureTime}
                    now={now}
                  />
                );
              }
              return <TransitBlock key={idx} option={o} arrivals={arrivals} now={now} />;
            })}
            {subwayError && (
              <div className="text-xs text-gray-500">Subway live data: {subwayError}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
