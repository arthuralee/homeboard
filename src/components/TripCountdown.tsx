import type { CalendarEvent } from '../hooks/useCalendar';
import { useNow } from '../hooks/useNow';

interface TripCountdownProps {
  event: CalendarEvent;
}

// Google Calendar auto-extracts flights from Gmail as
// "Flight to <Destination> (<AIRLINE> <NUMBER>)". Pull the destination out;
// fall back to the airport IATA code from the LOCATION field if parsing fails.
function parseDestination(event: CalendarEvent): string {
  const m = event.summary.match(/^Flight to (.+?)\s*\([^)]+\)\s*$/);
  if (m) return m[1].trim();
  const iata = event.location.match(/\b([A-Z]{3})\b\s*$/);
  if (iata) return iata[1];
  return event.location || event.summary;
}

export function TripCountdown({ event }: TripCountdownProps) {
  const now = useNow(60_000);

  // Whole days between now and departure, rounded up so "in 20 hours" reads
  // as "1 day" rather than "0 days".
  const msUntil = event.start.getTime() - now.getTime();
  const daysUntil = Math.max(0, Math.ceil(msUntil / (24 * 3600_000)));

  const bigLine =
    daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1 day' : `${daysUntil} days`;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="text-7xl font-bold tracking-tight leading-none">
        {bigLine}
      </div>
      <div className="mt-3 text-2xl text-gray-300 truncate max-w-full">
        Trip to {parseDestination(event)}
      </div>
    </div>
  );
}
