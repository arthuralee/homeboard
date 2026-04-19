import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, CalendarFeedResponse } from '../types';

const REFRESH_MS = 5 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dayOffsetLabel(eventStart: Date, today: Date): string {
  const diffDays = Math.round(
    (startOfDay(eventStart).getTime() - startOfDay(today).getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return eventStart.toLocaleDateString([], { weekday: 'long' });
}

function formatEventTime(start: Date, allDay: boolean): string {
  if (allDay) return 'All day';
  return start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type Group = { label: string; events: CalendarEvent[] };

function groupByDay(events: CalendarEvent[]): Group[] {
  const today = new Date();
  const groups: Record<string, Group> = {};
  const order: string[] = [];
  for (const e of events) {
    const label = dayOffsetLabel(new Date(e.start), today);
    if (!groups[label]) {
      groups[label] = { label, events: [] };
      order.push(label);
    }
    groups[label].events.push(e);
  }
  return order.map((k) => groups[k]);
}

export function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const resp = await fetch('/api/calendar');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: CalendarFeedResponse = await resp.json();
      if (data.error) throw new Error(data.error);
      setEvents(data.events);
      setError(null);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError('Calendar unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const groups = useMemo(() => groupByDay(events), [events]);

  if (loading) {
    return <div className="text-gray-500 text-xl animate-pulse">Loading calendar...</div>;
  }

  if (error) {
    return <div className="text-gray-500 text-xl">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="text-gray-500 text-xl">Nothing scheduled</div>;
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col min-h-0">
          <div className="text-base text-gray-500 uppercase tracking-wide mb-2">
            {group.label}
          </div>
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
            {group.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const start = new Date(event.start);
  return (
    <div className="flex items-baseline gap-5">
      <div className="w-32 flex-shrink-0 text-3xl font-semibold text-white tabular-nums">
        {formatEventTime(start, event.allDay)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-3xl text-white truncate">{event.title}</div>
        {event.location && (
          <div className="text-xl text-gray-400 truncate mt-0.5">{event.location}</div>
        )}
      </div>
    </div>
  );
}
