import { useEffect, useState } from 'react';
import ICAL from 'ical.js';
import { CALENDAR_REFRESH_MS, COMMUTE_LOOKAHEAD_HOURS } from '../config/commute';

export interface CalendarEvent {
  summary: string;
  location: string;
  start: Date;
  end: Date;
}

export interface UseCalendarResult {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

function expandEvents(icsText: string, windowStart: Date, windowEnd: Date): CalendarEvent[] {
  const jcal = ICAL.parse(icsText);
  const vcalendar = new ICAL.Component(jcal);
  const vevents = vcalendar.getAllSubcomponents('vevent');
  const windowEndIcal = ICAL.Time.fromJSDate(windowEnd, false);

  const out: CalendarEvent[] = [];

  for (const v of vevents) {
    const event = new ICAL.Event(v);
    if (!event.startDate) continue;

    if (event.isRecurring()) {
      const iter = event.iterator();
      let next = iter.next();
      while (next) {
        if (next.compare(windowEndIcal) > 0) break;
        const details = event.getOccurrenceDetails(next);
        const start = details.startDate.toJSDate();
        if (start >= windowStart && start <= windowEnd) {
          out.push({
            summary: event.summary ?? '',
            location: event.location ?? '',
            start,
            end: details.endDate.toJSDate(),
          });
        }
        next = iter.next();
      }
    } else {
      const start = event.startDate.toJSDate();
      if (start >= windowStart && start <= windowEnd) {
        out.push({
          summary: event.summary ?? '',
          location: event.location ?? '',
          start,
          end: event.endDate.toJSDate(),
        });
      }
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

export function useCalendar(): UseCalendarResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const url = import.meta.env.ARTHUR_GCAL_LINK;
    if (!url) {
      setError('ARTHUR_GCAL_LINK not set');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCalendar = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const now = new Date();
        const windowEnd = new Date(now.getTime() + COMMUTE_LOOKAHEAD_HOURS * 3600_000);
        const expanded = expandEvents(text, now, windowEnd);
        if (cancelled) return;
        setEvents(expanded);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('Calendar fetch error:', err);
        setError(err instanceof Error ? err.message : 'Calendar unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCalendar();
    const id = setInterval(fetchCalendar, CALENDAR_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { events, loading, error, lastUpdated };
}
