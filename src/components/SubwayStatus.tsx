import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { SubwayLine } from './SubwayLine';

interface Arrival {
  routeId: string;
  direction: string;
  arrivalTime: string;
  stationId: string;
}

interface StationConfig {
  id: string;
  name: string;
  displayName: string;
}

// Minimum minutes until arrival to display a train (filters out trains you can't catch)
const MIN_MINUTES_AWAY = 5;

// Station IDs from MTA GTFS data
const STATIONS: StationConfig[] = [
  { id: '137', name: '28 St', displayName: '28th St' }, // 1,2,3
  { id: 'R17', name: '28 St', displayName: '28th St' }, // N,R,W
  { id: 'D17', name: '34 St-Herald Sq', displayName: '34th St-Herald Sq' }, // B,D,F,M,N,Q,R,W
];

function formatArrivalTime(arrivalTime: string): string {
  const arrival = new Date(arrivalTime);
  const now = new Date();
  const diffMs = arrival.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'now';
  if (diffMins === 0) return 'now';
  if (diffMins === 1) return '1 min';
  return `${diffMins} min`;
}

function StationName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to max size
    el.style.fontSize = '1.5rem';

    // Shrink until it fits on one line
    let size = 24;
    while (el.scrollWidth > el.clientWidth && size > 12) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, [name]);

  return (
    <h3
      ref={ref}
      className="font-semibold text-white mb-2 flex-shrink-0 whitespace-nowrap overflow-hidden"
      style={{ fontSize: '1.5rem' }}
    >
      {name}
    </h3>
  );
}

export function SubwayStatus() {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchArrivals = useCallback(async () => {
    try {
      const stationIds = STATIONS.map(s => s.id).join(',');
      const response = await fetch(`/api/subway?stations=${stationIds}`);

      if (!response.ok) {
        throw new Error('Failed to fetch subway data');
      }

      const data = await response.json();
      setArrivals(data.arrivals || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Subway fetch error:', err);
      setError('Subway data unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
    const interval = setInterval(fetchArrivals, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchArrivals]);

  // Group arrivals by station and direction
  const groupedArrivals = STATIONS.map(station => {
    const now = Date.now();
    const minTimeMs = now + MIN_MINUTES_AWAY * 60000;
    const stationArrivals = arrivals
      .filter(a => a.stationId === station.id && new Date(a.arrivalTime).getTime() >= minTimeMs)
      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime());

    const uptown = stationArrivals.filter(a => a.direction === 'N').slice(0, 4);
    const downtown = stationArrivals.filter(a => a.direction === 'S').slice(0, 4);

    return { station, uptown, downtown };
  });

  if (loading) {
    return (
      <div className="text-gray-500 text-xl animate-pulse">
        Loading subway times...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-gray-500 text-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stations in horizontal grid */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {groupedArrivals.map(({ station, uptown, downtown }) => (
          <div key={station.id} className="flex flex-col min-h-0">
            {/* Station name */}
            <StationName name={station.displayName} />

            {/* Uptown and Downtown stacked */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Uptown */}
              <div className="flex-1 min-h-0">
                <div className="text-base text-gray-500 uppercase tracking-wide mb-1">Uptown</div>
                {uptown.length === 0 ? (
                  <div className="text-gray-600 text-xl">No trains</div>
                ) : (
                  <div className="space-y-1">
                    {uptown.map((arrival, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <SubwayLine line={arrival.routeId} size="lg" />
                        <span className="text-4xl font-semibold text-white tabular-nums">
                          {formatArrivalTime(arrival.arrivalTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Downtown */}
              <div className="flex-1 min-h-0">
                <div className="text-base text-gray-500 uppercase tracking-wide mb-1">Downtown</div>
                {downtown.length === 0 ? (
                  <div className="text-gray-600 text-xl">No trains</div>
                ) : (
                  <div className="space-y-1">
                    {downtown.map((arrival, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <SubwayLine line={arrival.routeId} size="lg" />
                        <span className="text-4xl font-semibold text-white tabular-nums">
                          {formatArrivalTime(arrival.arrivalTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lastUpdated && (
        <div className="text-xs text-gray-500 mt-3 flex-shrink-0">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
