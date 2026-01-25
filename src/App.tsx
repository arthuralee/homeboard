import { useState, useEffect } from 'react';
import { Clock } from './components/Clock';
import { Weather } from './components/Weather';
import { SubwayStatus } from './components/SubwayStatus';

function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white p-8 no-select">
      {/* Header with time and weather */}
      <header className="flex justify-between items-start mb-12">
        <Clock />
        <Weather />
      </header>

      {/* Main content - Subway Status */}
      <main className="flex-1">
        <div className="mb-6">
          <h2 className="text-3xl font-light text-gray-300 mb-6 flex items-center gap-3">
            <span className="text-4xl">🚇</span>
            Subway Arrivals
          </h2>
          <SubwayStatus />
        </div>
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
