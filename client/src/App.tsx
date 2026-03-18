import { lazy, Suspense, useEffect, useState, useCallback, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameState } from './hooks/useGameState';
import { useGameEvents } from './hooks/useGameEvents';

const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-pulse">
          Yacht Dice
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-white text-lg">Something went wrong.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-white"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('yacht-nickname') || '';
  });
  const ws = useWebSocket(nickname);
  const [state, dispatch] = useGameState();
  const [error, setError] = useState<string | null>(null);
  const handleError = useCallback((msg: string | null) => setError(msg), []);

  useEffect(() => {
    if (!nickname) return;
    ws.connect();
    return () => ws.disconnect();
  }, [nickname, ws.connect, ws.disconnect]);

  useEffect(() => {
    if (state.nickname && state.nickname !== nickname) {
      setNickname(state.nickname);
      localStorage.setItem('yacht-nickname', state.nickname);
    }
  }, [state.nickname, nickname]);

  // Warn before closing tab during active game
  useEffect(() => {
    if (state.phase !== 'game') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.phase]);

  useGameEvents(ws, dispatch, handleError);

  const page = (() => {
    switch (state.phase) {
      case 'lobby':
        return <Suspense fallback={<LoadingFallback />}><LobbyPage state={state} dispatch={dispatch} send={ws.send} on={ws.on} playerId={ws.playerId} /></Suspense>;
      case 'room':
        return <Suspense fallback={<LoadingFallback />}><RoomPage state={state} dispatch={dispatch} send={ws.send} playerId={ws.playerId} /></Suspense>;
      case 'game':
        return <Suspense fallback={<LoadingFallback />}><GamePage state={state} dispatch={dispatch} send={ws.send} playerId={ws.playerId} /></Suspense>;
      case 'result':
        return <Suspense fallback={<LoadingFallback />}><ResultPage state={state} dispatch={dispatch} send={ws.send} /></Suspense>;
    }
  })();

  return (
    <ErrorBoundary>
      {!ws.connected && nickname && !ws.connectionFailed && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-white text-center py-2 text-sm font-body" role="alert" aria-live="polite">
          Reconnecting\u2026
        </div>
      )}
      {ws.connectionFailed && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-800/90 text-white text-center py-2 text-sm font-body flex items-center justify-center gap-3" role="alert" aria-live="polite">
          <span>Connection lost.</span>
          <button
            onClick={ws.reconnect}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}
      {error && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600/90 text-white text-center py-2 text-sm font-body" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      <div key={state.phase} className="animate-fade-in">
        {page}
      </div>
    </ErrorBoundary>
  );
}
