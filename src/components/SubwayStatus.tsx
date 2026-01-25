import { useState, useEffect, useCallback } from 'react';
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
    const stationArrivals = arrivals
      .filter(a => a.stationId === station.id)
      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime());

    const uptown = stationArrivals.filter(a => a.direction === 'N').slice(0, 3);
    const downtown = stationArrivals.filter(a => a.direction === 'S').slice(0, 3);

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
        <div className="text-sm text-gray-600 mt-2">
          Configure MTA_API_KEY in Cloudflare
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedArrivals.map(({ station, uptown, downtown }) => (
        <div key={station.id} className="space-y-3">
          <h3 className="text-2xl font-semibold text-white">
            {station.displayName}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Uptown */}
            <div className="space-y-2">
              <div className="text-lg text-gray-400">Uptown</div>
              {uptown.length === 0 ? (
                <div className="text-gray-600">No trains</div>
              ) : (
                <div className="space-y-2">
                  {uptown.map((arrival, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <SubwayLine line={arrival.routeId} size="md" />
                      <span className="text-2xl font-medium text-white">
                        {formatArrivalTime(arrival.arrivalTime)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downtown */}
            <div className="space-y-2">
              <div className="text-lg text-gray-400">Downtown</div>
              {downtown.length === 0 ? (
                <div className="text-gray-600">No trains</div>
              ) : (
                <div className="space-y-2">
                  {downtown.map((arrival, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <SubwayLine line={arrival.routeId} size="md" />
                      <span className="text-2xl font-medium text-white">
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

      {lastUpdated && (
        <div className="text-sm text-gray-600">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
