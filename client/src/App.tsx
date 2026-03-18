import { lazy, Suspense, useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameState } from './hooks/useGameState';
import type {
  RoomState, GameRolledPayload, GameScoredPayload,
  GameTurnPayload, GameSyncPayload, GameEndPayload,
  ReactionShowPayload,
} from './types/game';

const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
      <div className="text-white/60 text-lg font-body">Loading…</div>
    </div>
  );
}

export default function App() {
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('yacht-nickname') || '';
  });
  const ws = useWebSocket(nickname);
  const [state, dispatch] = useGameState();
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const unsubs = [
      ws.on('room:state', (env) => {
        const p = env.payload as RoomState;
        dispatch({ type: 'SET_ROOM', roomCode: p.roomCode });
        dispatch({ type: 'SET_PLAYERS', players: p.players });
      }),
      ws.on('game:start', () => {
        dispatch({ type: 'SET_PHASE', phase: 'game' });
      }),
      ws.on('game:rolled', (env) => {
        const p = env.payload as GameRolledPayload;
        dispatch({ type: 'GAME_ROLLED', dice: p.dice, held: p.held, rollCount: p.rollCount });
      }),
      ws.on('game:scored', (env) => {
        const p = env.payload as GameScoredPayload;
        dispatch({ type: 'SET_SCORES', scores: p.totalScores });
      }),
      ws.on('game:turn', (env) => {
        const p = env.payload as GameTurnPayload;
        dispatch({ type: 'SET_TURN', currentPlayer: p.currentPlayer, round: p.round });
      }),
      ws.on('game:sync', (env) => {
        const p = env.payload as GameSyncPayload;
        dispatch({ type: 'GAME_SYNC', ...p });
      }),
      ws.on('game:end', (env) => {
        const p = env.payload as GameEndPayload;
        dispatch({ type: 'GAME_END', rankings: p.rankings });
      }),
      ws.on('reaction:show', (env) => {
        const p = env.payload as ReactionShowPayload;
        dispatch({ type: 'ADD_REACTION', playerId: p.playerId, emoji: p.emoji });
      }),
      ws.on('player:left', () => {}),
      ws.on('error', (env) => {
        const p = env.payload as { message: string };
        setError(p.message);
        setTimeout(() => setError(null), 5000);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [ws, dispatch]);

  const page = (() => {
    switch (state.phase) {
      case 'lobby':
        return <LobbyPage state={state} dispatch={dispatch} send={ws.send} on={ws.on} playerId={ws.playerId} />;
      case 'room':
        return <RoomPage state={state} dispatch={dispatch} send={ws.send} playerId={ws.playerId} />;
      case 'game':
        return <GamePage state={state} dispatch={dispatch} send={ws.send} playerId={ws.playerId} />;
      case 'result':
        return <ResultPage state={state} dispatch={dispatch} send={ws.send} />;
    }
  })();

  return (
    <>
      {!ws.connected && nickname && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-white text-center py-2 text-sm font-body" role="alert" aria-live="polite">
          Reconnecting…
        </div>
      )}
      {error && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600/90 text-white text-center py-2 text-sm font-body" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      <Suspense fallback={<LoadingFallback />}>
        {page}
      </Suspense>
    </>
  );
}
