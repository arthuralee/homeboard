import { useCallback, useEffect, useMemo, useState } from 'react';
import { SubwayLine } from './SubwayLine';
import type { CalendarEvent } from '../hooks/useCalendar';
import { useCommute, type CommuteOption, type TransitOption } from '../hooks/useCommute';
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
  const titleSize = subtle ? 'text-5xl' : 'text-4xl';
  return (
    <div className="flex-shrink-0">
      <div className="text-lg text-gray-300 uppercase tracking-wider font-semibold mb-2">
        Up next{!subtle && ` · in ${formatCountdown(event.start, now)}`}
      </div>
      <div className={`${titleSize} font-bold text-white leading-tight truncate`}>
        {event.summary}
      </div>
      <div className="text-2xl text-gray-200 mt-2 truncate font-medium">
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
    <div className={`rounded-xl bg-gray-900/60 px-4 py-3 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3 text-xl font-bold text-white">
        <span className="text-2xl" aria-hidden>{emoji}</span>
        <span>{label}</span>
        <span className="text-gray-300 font-medium">{subtitle}</span>
      </div>
      {!dimmed && (
        <div className="mt-1 text-lg text-white font-semibold">
          {formatLeaveBy(departureTime, now)}
        </div>
      )}
    </div>
  );
}

function WalkDuration({ minutes }: { minutes: number }) {
  return <span>{minutes}m</span>;
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
  // Earliest train the user can realistically catch: they have to finish
  // walking to the station first.
  const reachStationAt = now.getTime() + option.walkToStationMinutes * 60_000;
  const catchable = arrivals
    .filter(
      (a) =>
        a.stationId === option.transit.stationId &&
        a.routeId === option.transit.line &&
        a.direction === option.transit.direction &&
        new Date(a.arrivalTime).getTime() >= reachStationAt,
    )
    .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime());

  const nextCatch = catchable[0];
  const waitMinutes = nextCatch
    ? Math.max(0, Math.round((new Date(nextCatch.arrivalTime).getTime() - reachStationAt) / 60_000))
    : null;

  return (
    <div className="rounded-xl bg-gray-900/60 px-4 py-3">
      <div className="flex items-center gap-2 text-xl font-bold text-white flex-wrap">
        <WalkDuration minutes={option.walkToStationMinutes} />
        {waitMinutes !== null && (
          <>
            <span className="text-gray-400" aria-hidden>›</span>
            <span className="flex items-center gap-1">
              <span aria-hidden>⏳</span>
              <span>{waitMinutes}m</span>
            </span>
          </>
        )}
        <span className="text-gray-400" aria-hidden>›</span>
        <SubwayLine line={option.transit.line} size="md" />
        <span className="text-gray-400" aria-hidden>›</span>
        <WalkDuration minutes={option.walkFromStationMinutes} />
      </div>
      <div className="mt-1 text-lg text-white font-semibold">
        {formatLeaveBy(option.departureTime, now)}
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

  const orderedOptions = useMemo(() => {
    const kindRank: Record<CommuteOption['kind'], number> = { walk: 0, drive: 1, transit: 2 };
    return [...options].sort((a, b) => kindRank[a.kind] - kindRank[b.kind]);
  }, [options]);

  if (farAway) {
    return (
      <div className="h-full flex flex-col">
        <EventHeader event={event} now={now} subtle />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <EventHeader event={event} now={now} />

      <div className="flex-1 min-h-0 space-y-2">
        {loading && orderedOptions.length === 0 ? (
          <div className="text-gray-300 text-2xl animate-pulse">Looking up routes…</div>
        ) : orderedOptions.length === 0 ? (
          <div className="text-gray-300 text-2xl">
            {error ? `No routes (${error})` : 'No routes available'}
          </div>
        ) : (
          <>
            {orderedOptions.map((o, idx) => {
              if (o.kind === 'walk') {
                return (
                  <SimpleOptionBlock
                    key={idx}
                    emoji="🚶"
                    label="Walk"
                    subtitle={`${o.totalMinutes}m`}
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
                    subtitle={`${o.totalMinutes}m with traffic`}
                    departureTime={o.departureTime}
                    now={now}
                  />
                );
              }
              return <TransitBlock key={idx} option={o} arrivals={arrivals} now={now} />;
            })}
            {subwayError && (
              <div className="text-base text-gray-300">Subway live data: {subwayError}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
