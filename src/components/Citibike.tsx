import { useEffect, useState } from 'react';

// Citibike dock short_name (printed on the station) near home
const STATION_SHORT_NAME = '6289.06';

const INFO_URL = 'https://gbfs.citibikenyc.com/gbfs/en/station_information.json';
const STATUS_URL = 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json';

interface StationInfo {
  station_id: string;
  short_name: string;
}

interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available?: number;
  num_docks_available: number;
  is_renting: number;
  is_installed: number;
  last_reported: number;
}

interface Availability {
  bikes: number;
  ebikes: number;
  lastReported: Date;
}

export function Citibike() {
  const [data, setData] = useState<Availability | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const infoResp = await fetch(INFO_URL);
        if (!infoResp.ok) throw new Error('info fetch failed');
        const infoJson = await infoResp.json();
        const station: StationInfo | undefined = infoJson.data.stations.find(
          (s: StationInfo) => s.short_name === STATION_SHORT_NAME
        );
        if (!station) throw new Error(`Station ${STATION_SHORT_NAME} not found`);

        const stationId = station.station_id;

        const fetchStatus = async () => {
          try {
            const resp = await fetch(STATUS_URL);
            if (!resp.ok) throw new Error('status fetch failed');
            const json = await resp.json();
            const status: StationStatus | undefined = json.data.stations.find(
              (s: StationStatus) => s.station_id === stationId
            );
            if (!status) throw new Error('Station status missing');
            if (cancelled) return;
            setData({
              bikes: status.num_bikes_available ?? 0,
              ebikes: status.num_ebikes_available ?? 0,
              lastReported: new Date(status.last_reported * 1000),
            });
            setError(null);
          } catch (err) {
            console.error('Citibike status error:', err);
            if (!cancelled) setError('Citibike unavailable');
          }
        };

        await fetchStatus();
        intervalId = setInterval(fetchStatus, 60 * 1000);
      } catch (err) {
        console.error('Citibike init error:', err);
        if (!cancelled) setError('Citibike unavailable');
      }
    };

    load();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (error) {
    return <div className="text-gray-300 text-3xl">{error}</div>;
  }

  if (!data) {
    return <div className="text-gray-300 text-3xl animate-pulse">Loading bikes...</div>;
  }

  return (
    <div className="h-full flex items-center justify-around gap-4">
      <div className="flex items-center gap-3">
        <div className="text-5xl leading-none" aria-hidden>🚲</div>
        <div className="flex flex-col items-start">
          <div className="text-5xl font-semibold text-white tabular-nums leading-none">
            {data.bikes}
          </div>
          <div className="text-base text-gray-300 uppercase tracking-wide font-semibold mt-1">Bikes</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-5xl leading-none" aria-hidden>⚡</div>
        <div className="flex flex-col items-start">
          <div className="text-5xl font-semibold text-white tabular-nums leading-none">
            {data.ebikes}
          </div>
          <div className="text-base text-gray-300 uppercase tracking-wide font-semibold mt-1">E-Bikes</div>
        </div>
      </div>
    </div>
  );
}
