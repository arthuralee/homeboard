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
    <div className="flex items-baseline gap-6">
      <div className="text-8xl font-semibold tracking-tight text-white">
        {timeString}
      </div>
      <div className="text-3xl font-medium text-gray-200">
        {dateString}
      </div>
    </div>
  );
}
