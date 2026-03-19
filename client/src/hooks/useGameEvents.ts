import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { useWebSocket } from './useWebSocket';
import type { GameAction } from './useGameState';
import type {
  RoomState, GameRolledPayload, GameScoredPayload,
  GameTurnPayload, GameSyncPayload, GameEndPayload,
  ReactionShowPayload, GameHeldPayload, GameHoveredPayload,
} from '../types/game';

type WS = ReturnType<typeof useWebSocket>;

export function useGameEvents(
  ws: WS,
  dispatch: Dispatch<GameAction>,
  setError: (error: string | null) => void,
) {
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
        dispatch({ type: 'GAME_ROLLED', dice: p.dice, held: p.held, rollCount: p.rollCount, preview: p.preview });
      }),
      ws.on('game:pour', () => {
        dispatch({ type: 'GAME_POUR' });
      }),
      ws.on('game:held', (env) => {
        const p = env.payload as GameHeldPayload;
        dispatch({ type: 'GAME_HELD', held: p.held });
      }),
      ws.on('game:hovered', (env) => {
        const p = env.payload as GameHoveredPayload;
        dispatch({ type: 'SET_HOVERED', category: p.category, playerId: p.playerId });
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
      ws.on('player:left', (env) => {
        const p = env.payload as { playerId: string };
        dispatch({ type: 'REMOVE_PLAYER', playerId: p.playerId });
      }),
      ws.on('error', (env) => {
        const p = env.payload as { message: string };
        setError(p.message);
        setTimeout(() => setError(null), 5000);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [ws.on, dispatch, setError]);
}
