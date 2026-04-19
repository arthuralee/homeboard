// Commute widget config. Tune these without touching component code.

export interface CommuteStation {
  id: string;
  name: string;
  displayName: string;
}

// Stations you can realistically depart from for the outbound commute.
export const COMMUTE_HOME_STATIONS: CommuteStation[] = [
  { id: '137', name: '28 St', displayName: '28th St (1/2/3)' },
  { id: 'R17', name: '28 St', displayName: '28th St (N/R/W)' },
  { id: 'D17', name: '34 St-Herald Sq', displayName: '34th St Herald Sq' },
];

// 'N' = uptown, 'S' = downtown. Direction shown in the commute widget.
export const COMMUTE_OUTBOUND_DIRECTION: 'N' | 'S' = 'N';

// Estimated end-to-end travel time (walk + train + walk), in minutes.
export const COMMUTE_TRAVEL_MINUTES = 30;

// Extra minutes you want to arrive before the event starts.
export const COMMUTE_BUFFER_MINUTES = 10;

// Only surface events that start within this many hours from now.
export const COMMUTE_LOOKAHEAD_HOURS = 14;

// How often to refetch the calendar feed.
export const CALENDAR_REFRESH_MS = 5 * 60 * 1000;
