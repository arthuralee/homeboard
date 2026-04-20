// Commute widget config. Tune these without touching component code.

export interface CommuteStation {
  id: string;
  name: string;
  displayName: string;
}

// Stations used as fallback when Google Directions can't be resolved
// (unknown location, API failure, etc).
export const COMMUTE_HOME_STATIONS: CommuteStation[] = [
  { id: '137', name: '28 St', displayName: '28th St (1/2/3)' },
  { id: 'R17', name: '28 St', displayName: '28th St (N/R/W)' },
  { id: 'D17', name: '34 St-Herald Sq', displayName: '34th St Herald Sq' },
];

// Outbound direction used by the fallback view ('N' = uptown, 'S' = downtown).
export const COMMUTE_OUTBOUND_DIRECTION: 'N' | 'S' = 'N';

// Static travel estimate used only when Google Directions is unavailable.
export const COMMUTE_TRAVEL_MINUTES = 30;
export const COMMUTE_BUFFER_MINUTES = 10;

// Only surface events starting within this many hours from now.
export const COMMUTE_LOOKAHEAD_HOURS = 14;
export const CALENDAR_REFRESH_MS = 5 * 60 * 1000;

// Map from (Google departure-station name, line short_name) to MTA GTFS
// station ID. Add entries here for any station near home that Google's
// Directions API might route you through.
export const GOOGLE_STATION_MAP: Record<string, { stationId: string; displayName: string }> = {
  '28 St|N': { stationId: 'R17', displayName: '28th St (N)' },
  '28 St|R': { stationId: 'R17', displayName: '28th St (R)' },
  '28 St|W': { stationId: 'R17', displayName: '28th St (W)' },
  '28 St|1': { stationId: '137', displayName: '28th St (1)' },
  '28 St|2': { stationId: '137', displayName: '28th St (2)' },
  '28 St|3': { stationId: '137', displayName: '28th St (3)' },
  '34 St-Herald Sq|B': { stationId: 'D17', displayName: '34th St Herald Sq (B)' },
  '34 St-Herald Sq|D': { stationId: 'D17', displayName: '34th St Herald Sq (D)' },
  '34 St-Herald Sq|F': { stationId: 'D17', displayName: '34th St Herald Sq (F)' },
  '34 St-Herald Sq|M': { stationId: 'D17', displayName: '34th St Herald Sq (M)' },
  '34 St-Herald Sq|N': { stationId: 'D17', displayName: '34th St Herald Sq (N)' },
  '34 St-Herald Sq|Q': { stationId: 'D17', displayName: '34th St Herald Sq (Q)' },
  '34 St-Herald Sq|R': { stationId: 'D17', displayName: '34th St Herald Sq (R)' },
  '34 St-Herald Sq|W': { stationId: 'D17', displayName: '34th St Herald Sq (W)' },
  // 34 St-Penn Station: two separate GTFS parent stops
  '34 St-Penn Station|1': { stationId: '132', displayName: '34th St-Penn Station (1)' },
  '34 St-Penn Station|2': { stationId: '132', displayName: '34th St-Penn Station (2)' },
  '34 St-Penn Station|3': { stationId: '132', displayName: '34th St-Penn Station (3)' },
  '34 St-Penn Station|A': { stationId: 'A28', displayName: '34th St-Penn Station (A)' },
  '34 St-Penn Station|C': { stationId: 'A28', displayName: '34th St-Penn Station (C)' },
  '34 St-Penn Station|E': { stationId: 'A28', displayName: '34th St-Penn Station (E)' },
};

// Headsign keyword → MTA direction. First match wins per (line, headsign)
// substring. Covers the lines stopping at the home stations above.
export const HEADSIGN_DIRECTION_RULES: Array<{
  line: string;
  headsignContains: string;
  direction: 'N' | 'S';
}> = [
  // N / W — Astoria ↔ Coney Island / Whitehall
  { line: 'N', headsignContains: 'Astoria', direction: 'N' },
  { line: 'N', headsignContains: 'Ditmars', direction: 'N' },
  { line: 'N', headsignContains: 'Coney', direction: 'S' },
  { line: 'W', headsignContains: 'Astoria', direction: 'N' },
  { line: 'W', headsignContains: 'Ditmars', direction: 'N' },
  { line: 'W', headsignContains: 'Whitehall', direction: 'S' },
  // R — Forest Hills (Queens) ↔ Bay Ridge (Brooklyn)
  { line: 'R', headsignContains: 'Forest Hills', direction: 'N' },
  { line: 'R', headsignContains: 'Queens', direction: 'N' },
  { line: 'R', headsignContains: 'Bay Ridge', direction: 'S' },
  { line: 'R', headsignContains: 'Brooklyn', direction: 'S' },
  // 1 — Van Cortlandt ↔ South Ferry
  { line: '1', headsignContains: 'Van Cortlandt', direction: 'N' },
  { line: '1', headsignContains: '242', direction: 'N' },
  { line: '1', headsignContains: 'South Ferry', direction: 'S' },
  // 2 — Wakefield (Bronx) ↔ Flatbush (Brooklyn)
  { line: '2', headsignContains: 'Wakefield', direction: 'N' },
  { line: '2', headsignContains: '241', direction: 'N' },
  { line: '2', headsignContains: 'Flatbush', direction: 'S' },
  { line: '2', headsignContains: 'Brooklyn', direction: 'S' },
  // 3 — Harlem ↔ New Lots (Brooklyn)
  { line: '3', headsignContains: 'Harlem', direction: 'N' },
  { line: '3', headsignContains: '148', direction: 'N' },
  { line: '3', headsignContains: 'New Lots', direction: 'S' },
  { line: '3', headsignContains: 'Brooklyn', direction: 'S' },
  // B — Bedford Park (Bronx) ↔ Brighton (Brooklyn)
  { line: 'B', headsignContains: 'Bedford Park', direction: 'N' },
  { line: 'B', headsignContains: 'Bronx', direction: 'N' },
  { line: 'B', headsignContains: 'Brighton', direction: 'S' },
  // D — Norwood (Bronx) ↔ Coney Island
  { line: 'D', headsignContains: 'Norwood', direction: 'N' },
  { line: 'D', headsignContains: '205', direction: 'N' },
  { line: 'D', headsignContains: 'Coney', direction: 'S' },
  // F — Jamaica (Queens) ↔ Coney Island
  { line: 'F', headsignContains: 'Jamaica', direction: 'N' },
  { line: 'F', headsignContains: '179', direction: 'N' },
  { line: 'F', headsignContains: 'Coney', direction: 'S' },
  // M — Forest Hills / Middle Village ↔ Metropolitan (Brooklyn)
  { line: 'M', headsignContains: 'Forest Hills', direction: 'N' },
  { line: 'M', headsignContains: 'Middle Village', direction: 'N' },
  { line: 'M', headsignContains: 'Metropolitan', direction: 'S' },
  // Q — 96 St (Upper East Side) ↔ Coney Island
  { line: 'Q', headsignContains: '96', direction: 'N' },
  { line: 'Q', headsignContains: 'Coney', direction: 'S' },
  // A — Inwood (Manhattan) ↔ Far Rockaway / Lefferts Blvd (Queens)
  { line: 'A', headsignContains: 'Inwood', direction: 'N' },
  { line: 'A', headsignContains: '207', direction: 'N' },
  { line: 'A', headsignContains: 'Far Rockaway', direction: 'S' },
  { line: 'A', headsignContains: 'Lefferts', direction: 'S' },
  { line: 'A', headsignContains: 'Ozone Park', direction: 'S' },
  // C — 168 St (Washington Heights) ↔ Euclid Ave (Brooklyn)
  { line: 'C', headsignContains: '168', direction: 'N' },
  { line: 'C', headsignContains: 'Washington Heights', direction: 'N' },
  { line: 'C', headsignContains: 'Euclid', direction: 'S' },
  // E — Jamaica Center (Queens) ↔ World Trade Center (Manhattan)
  { line: 'E', headsignContains: 'Jamaica', direction: 'N' },
  { line: 'E', headsignContains: 'Parsons', direction: 'N' },
  { line: 'E', headsignContains: 'World Trade', direction: 'S' },
  { line: 'E', headsignContains: 'WTC', direction: 'S' },
];
