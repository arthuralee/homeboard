import { useState, useEffect, type ReactNode } from 'react';
import { Clock } from './components/Clock';
import { Weather } from './components/Weather';
import { Citibike } from './components/Citibike';
import { CommuteCard } from './components/CommuteCard';
import { useCalendar } from './hooks/useCalendar';

function Widget({
  title,
  className = '',
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`bg-gray-800/60 rounded-2xl p-6 flex flex-col min-w-0 min-h-0 ${className}`}
    >
      {title && (
        <h2 className="text-lg text-gray-300 uppercase tracking-wider font-semibold mb-4 flex-shrink-0">
          {title}
        </h2>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { events: calendarEvents } = useCalendar();
  // Events from the hook are already filtered to the lookahead window and
  // sorted ascending, so the first one with a location is the next commute.
  const nextCommute = calendarEvents.find((e) => e.location.trim().length > 0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-refresh the page every 5 minutes to pick up code updates
  useEffect(() => {
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const intervalId = setInterval(() => {
      window.location.reload();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white p-6 no-select flex flex-col overflow-hidden">
      {/* Compact header with clock */}
      <header className="flex-shrink-0 mb-4">
        <Clock />
      </header>

      {/* Main content — 6-column × 6-row widget grid. Each widget is 2 cols
          wide, leaving a 2-column gap in the middle for future widgets. */}
      <main className="flex-1 min-h-0 grid grid-cols-6 grid-rows-6 gap-4">
        {nextCommute && (
          <Widget className="col-span-2 row-span-6">
            <CommuteCard event={nextCommute} />
          </Widget>
        )}

        <Widget title="Weather" className="col-span-2 col-start-5 row-span-4">
          <Weather />
        </Widget>

        <Widget title="Citibike — Broadway & W 29th" className="col-span-2 col-start-5 row-span-2">
          <Citibike />
        </Widget>
      </main>

      {/* Fullscreen toggle button - subtle, bottom right */}
      <button
        onClick={toggleFullscreen}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-white"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default App;
