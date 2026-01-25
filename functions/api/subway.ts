// Cloudflare Pages Function to proxy MTA API requests
// MTA GTFS-RT feeds are publicly accessible (no API key required)

interface Env {}

interface Arrival {
  routeId: string;
  direction: string;
  arrivalTime: string;
  stationId: string;
}

// MTA GTFS-RT Feed URLs (public, no API key required)
// See: https://api.mta.info/#/subwayRealTimeFeeds
const FEED_URLS: Record<string, string> = {
  'ace': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
  'bdfm': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  'g': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
  'jz': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
  'nqrw': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
  'l': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
  '1234567': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  'si': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
};

// Simple GTFS-RT protobuf parsing
// The MTA feed uses Protocol Buffers, but we can use a simplified JSON endpoint
// or parse the protobuf manually

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const stationIds = url.searchParams.get('stations')?.split(',') || [];

  try {
    const arrivals: Arrival[] = [];

    // Fetch from all feeds in parallel
    const feedPromises = Object.entries(FEED_URLS).map(async ([feedId, feedUrl]) => {
      try {
        const response = await fetch(feedUrl);

        if (!response.ok) {
          console.error(`Feed ${feedId} error: ${response.status}`);
          return [];
        }

        // The MTA returns Protocol Buffers data
        // We need to parse it - for simplicity, we'll use a basic parser
        const buffer = await response.arrayBuffer();
        const feedArrivals = parseGtfsRealtimeFeed(buffer, stationIds);
        return feedArrivals;
      } catch (err) {
        console.error(`Feed ${feedId} fetch error:`, err);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    results.forEach(feedArrivals => arrivals.push(...feedArrivals));

    // Sort by arrival time
    arrivals.sort((a, b) =>
      new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
    );

    return new Response(JSON.stringify({ arrivals }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15',
      },
    });
  } catch (err) {
    console.error('Subway API error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch subway data', arrivals: [] }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Basic GTFS-RT protobuf parser
// This is a simplified implementation that extracts trip updates
function parseGtfsRealtimeFeed(buffer: ArrayBuffer, stationIds: string[]): Arrival[] {
  const arrivals: Arrival[] = [];
  const bytes = new Uint8Array(buffer);

  // GTFS-RT uses Protocol Buffers
  // We need to decode the FeedMessage -> FeedEntity[] -> TripUpdate -> StopTimeUpdate[]
  // This is a basic implementation - in production, use a proper protobuf library

  try {
    const decoded = decodeProtobuf(bytes);

    if (decoded.entity) {
      for (const entity of decoded.entity) {
        if (entity.tripUpdate) {
          const routeId = entity.tripUpdate.trip?.routeId || '';

          if (entity.tripUpdate.stopTimeUpdate) {
            for (const stu of entity.tripUpdate.stopTimeUpdate) {
              const stopId = stu.stopId || '';
              // Stop IDs have direction suffix (N/S), e.g., "635N" or "635S"
              const baseStopId = stopId.slice(0, -1);
              const direction = stopId.slice(-1) as 'N' | 'S';

              if (stationIds.includes(baseStopId)) {
                const arrivalTime = stu.arrival?.time || stu.departure?.time;
                if (arrivalTime) {
                  const arrivalDate = new Date(arrivalTime * 1000);
                  // Only include arrivals in the next 30 minutes
                  const now = new Date();
                  const diffMins = (arrivalDate.getTime() - now.getTime()) / 60000;

                  if (diffMins >= -1 && diffMins <= 30) {
                    arrivals.push({
                      routeId,
                      direction,
                      arrivalTime: arrivalDate.toISOString(),
                      stationId: baseStopId,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Protobuf parse error:', err);
  }

  return arrivals;
}

// Basic protobuf decoder for GTFS-RT
// This handles the wire format for the specific GTFS-RT message structure
function decodeProtobuf(bytes: Uint8Array): any {
  const result: any = {};
  let pos = 0;

  function readVarint(): number {
    let value = 0;
    let shift = 0;
    while (pos < bytes.length) {
      const byte = bytes[pos++];
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return value;
  }

  function readString(): string {
    const length = readVarint();
    const str = new TextDecoder().decode(bytes.slice(pos, pos + length));
    pos += length;
    return str;
  }

  function readBytes(): Uint8Array {
    const length = readVarint();
    const data = bytes.slice(pos, pos + length);
    pos += length;
    return data;
  }

  function decodeMessage(endPos: number): any {
    const msg: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      switch (wireType) {
        case 0: // Varint
          msg[fieldNumber] = readVarint();
          break;
        case 1: // 64-bit
          pos += 8;
          break;
        case 2: // Length-delimited
          const length = readVarint();
          const endOfField = pos + length;

          // Try to decode as nested message for known fields
          if (fieldNumber === 1 && !msg.header) {
            // Header
            msg.header = decodeMessage(endOfField);
          } else if (fieldNumber === 2) {
            // Entity (repeated)
            if (!msg.entity) msg.entity = [];
            const savedPos = pos;
            const entity = decodeEntity(endOfField);
            msg.entity.push(entity);
          } else {
            pos = endOfField;
          }
          break;
        case 5: // 32-bit
          pos += 4;
          break;
        default:
          return msg;
      }
    }

    return msg;
  }

  function decodeEntity(endPos: number): any {
    const entity: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      if (wireType === 2) {
        const length = readVarint();
        const endOfField = pos + length;

        if (fieldNumber === 1) {
          // Entity ID
          entity.id = new TextDecoder().decode(bytes.slice(pos, endOfField));
          pos = endOfField;
        } else if (fieldNumber === 3) {
          // TripUpdate
          entity.tripUpdate = decodeTripUpdate(endOfField);
        } else {
          pos = endOfField;
        }
      } else if (wireType === 0) {
        readVarint();
      } else {
        break;
      }
    }

    return entity;
  }

  function decodeTripUpdate(endPos: number): any {
    const tripUpdate: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      if (wireType === 2) {
        const length = readVarint();
        const endOfField = pos + length;

        if (fieldNumber === 1) {
          // Trip descriptor
          tripUpdate.trip = decodeTripDescriptor(endOfField);
        } else if (fieldNumber === 2) {
          // StopTimeUpdate (repeated)
          if (!tripUpdate.stopTimeUpdate) tripUpdate.stopTimeUpdate = [];
          tripUpdate.stopTimeUpdate.push(decodeStopTimeUpdate(endOfField));
        } else {
          pos = endOfField;
        }
      } else if (wireType === 0) {
        readVarint();
      } else {
        break;
      }
    }

    return tripUpdate;
  }

  function decodeTripDescriptor(endPos: number): any {
    const trip: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      if (wireType === 2) {
        const length = readVarint();
        const str = new TextDecoder().decode(bytes.slice(pos, pos + length));
        pos += length;

        if (fieldNumber === 1) trip.tripId = str;
        else if (fieldNumber === 5) trip.routeId = str;
      } else if (wireType === 0) {
        const value = readVarint();
        if (fieldNumber === 4) trip.scheduleRelationship = value;
      } else {
        break;
      }
    }

    return trip;
  }

  function decodeStopTimeUpdate(endPos: number): any {
    const stu: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      if (wireType === 2) {
        const length = readVarint();
        const endOfField = pos + length;

        if (fieldNumber === 2) {
          // Arrival
          stu.arrival = decodeStopTimeEvent(endOfField);
        } else if (fieldNumber === 3) {
          // Departure
          stu.departure = decodeStopTimeEvent(endOfField);
        } else if (fieldNumber === 4) {
          // Stop ID
          stu.stopId = new TextDecoder().decode(bytes.slice(pos, endOfField));
          pos = endOfField;
        } else {
          pos = endOfField;
        }
      } else if (wireType === 0) {
        const value = readVarint();
        if (fieldNumber === 1) stu.stopSequence = value;
      } else {
        break;
      }
    }

    return stu;
  }

  function decodeStopTimeEvent(endPos: number): any {
    const event: any = {};

    while (pos < endPos) {
      const tag = readVarint();
      const fieldNumber = tag >>> 3;
      const wireType = tag & 0x7;

      if (wireType === 0) {
        const value = readVarint();
        if (fieldNumber === 2) event.time = value;
        else if (fieldNumber === 1) event.delay = value;
      } else if (wireType === 2) {
        const length = readVarint();
        pos += length;
      } else {
        break;
      }
    }

    return event;
  }

  return decodeMessage(bytes.length);
}
