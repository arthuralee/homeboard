import { useNow } from '../hooks/useNow';

export function Clock() {
  const time = useNow(1000);

  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex items-baseline gap-4">
      <div className="text-6xl font-light tracking-tight text-white">
        {timeString}
      </div>
      <div className="text-xl text-gray-400">
        {dateString}
      </div>
    </div>
  );
}
