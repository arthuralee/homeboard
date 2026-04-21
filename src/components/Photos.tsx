import { useEffect, useRef, useState } from 'react';

const CYCLE_MS = 30_000;
const LIST_REFRESH_MS = 60 * 60 * 1000;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function photoUrl(key: string): string {
  return `/api/photos/${encodeURIComponent(key)}`;
}

export function Photos() {
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Two slots that alternate so we can crossfade. `activeSlot` is the one
  // currently shown; the other preloads the next image behind it.
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const slotKeys = useRef<[string | null, string | null]>([null, null]);

  useEffect(() => {
    let cancelled = false;

    const loadList = async () => {
      try {
        const resp = await fetch('/api/photos');
        if (!resp.ok) throw new Error('list fetch failed');
        const json = (await resp.json()) as { photos: string[] };
        if (cancelled) return;
        if (!json.photos.length) {
          setError('No photos');
          return;
        }
        setOrder(shuffle(json.photos));
        setIndex(0);
        setError(null);
      } catch (err) {
        console.error('Photos list error:', err);
        if (!cancelled) setError('Photos unavailable');
      }
    };

    loadList();
    const refreshId = setInterval(loadList, LIST_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    if (order.length === 0) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % order.length);
      setActiveSlot((prev) => (prev === 0 ? 1 : 0));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [order]);

  // Place the current key into the slot that's about to become active so it
  // preloads before we flip visibility.
  if (order.length > 0) {
    slotKeys.current[activeSlot] = order[index];
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-300 text-3xl">
        {error}
      </div>
    );
  }

  if (order.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-300 text-3xl animate-pulse">
        Loading photos...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      {[0, 1].map((slot) => {
        const key = slotKeys.current[slot as 0 | 1];
        if (!key) return null;
        return (
          <img
            key={`${slot}-${key}`}
            src={photoUrl(key)}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              activeSlot === slot ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}
    </div>
  );
}
