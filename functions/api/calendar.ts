// Cloudflare Pages Function that proxies a Google Calendar secret iCal feed.
// The URL is stored as the ARTHUR_GCAL_LINK env var so it never ships to the client.

import ICAL from 'ical.js';

interface Env {
  ARTHUR_GCAL_LINK?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
}

// How far ahead to expand recurring events.
const WINDOW_HOURS = 48;
const MAX_OCCURRENCES_PER_EVENT = 500;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const icalUrl = context.env.ARTHUR_GCAL_LINK;
  if (!icalUrl) {
    return jsonResponse({ error: 'ARTHUR_GCAL_LINK not configured', events: [] }, 500);
  }

  try {
    const resp = await fetch(icalUrl, {
      headers: { 'User-Agent': 'homeboard/1.0' },
    });
    if (!resp.ok) {
      return jsonResponse(
        { error: `Upstream fetch failed: ${resp.status}`, events: [] },
        502,
      );
    }

    const icsText = await resp.text();
    const events = parseEvents(icsText);

    return jsonResponse(
      { events },
      200,
      { 'Cache-Control': 'public, max-age=300' },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar parse failed';
    return jsonResponse({ error: message, events: [] }, 500);
  }
};

function parseEvents(icsText: string): CalendarEvent[] {
  const jcal = ICAL.parse(icsText);
  const vcal = new ICAL.Component(jcal);

  for (const vtz of vcal.getAllSubcomponents('vtimezone')) {
    const tz = new ICAL.Timezone(vtz);
    if (!ICAL.TimezoneService.has(tz.tzid)) {
      ICAL.TimezoneService.register(tz.tzid, tz);
    }
  }

  const now = ICAL.Time.now();
  const rangeEnd = now.clone();
  rangeEnd.addDuration(ICAL.Duration.fromSeconds(WINDOW_HOURS * 3600));

  const out: CalendarEvent[] = [];

  for (const vevent of vcal.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);

    if (event.isRecurring()) {
      const iter = event.iterator();
      let guard = MAX_OCCURRENCES_PER_EVENT;
      let next;
      while ((next = iter.next()) && guard-- > 0) {
        if (next.compare(rangeEnd) > 0) break;
        const details = event.getOccurrenceDetails(next);
        if (details.endDate.compare(now) < 0) continue;
        out.push(toCalendarEvent(event, details.startDate, details.endDate));
      }
    } else {
      const end = event.endDate ?? event.startDate;
      if (end.compare(now) < 0) continue;
      if (event.startDate.compare(rangeEnd) > 0) continue;
      out.push(toCalendarEvent(event, event.startDate, end));
    }
  }

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

function toCalendarEvent(
  event: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time,
): CalendarEvent {
  return {
    id: `${event.uid}-${start.toUnixTime()}`,
    title: event.summary || '(untitled)',
    location: event.location || null,
    start: start.toJSDate().toISOString(),
    end: end.toJSDate().toISOString(),
    allDay: start.isDate,
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
