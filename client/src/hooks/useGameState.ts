import { useReducer } from 'react';
import type {
  GamePhase, PlayerInfo, RankEntry,
} from '../types/game';

export interface GameState {
  phase: GamePhase;
  nickname: string;
  roomCode: string | null;
  players: PlayerInfo[];
  dice: number[];
  held: boolean[];
  rollCount: number;
  currentPlayer: string | null;
  round: number;
  scores: Record<string, Record<string, number>>;
  rankings: RankEntry[];
  reactions: { playerId: string; emoji: string; id: string }[];
  preview: Record<string, number>;
  hoveredCategory: { category: string | null; playerId: string } | null;
  pourCount: number;
}

export type GameAction =
  | { type: 'SET_NICKNAME'; nickname: string }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_ROOM'; roomCode: string }
  | { type: 'SET_PLAYERS'; players: PlayerInfo[] }
  | { type: 'GAME_ROLLED'; dice: number[]; held: boolean[]; rollCount: number; preview: Record<string, number> }
  | { type: 'GAME_HELD'; held: boolean[] }
  | { type: 'SET_TURN'; currentPlayer: string; round: number }
  | { type: 'SET_SCORES'; scores: Record<string, Record<string, number>> }
  | { type: 'GAME_END'; rankings: RankEntry[] }
  | { type: 'GAME_SYNC'; dice: number[]; held: boolean[]; rollCount: number; scores: Record<string, Record<string, number>>; currentPlayer: string; round: number; preview: Record<string, number> }
  | { type: 'ADD_REACTION'; playerId: string; emoji: string }
  | { type: 'CLEAR_REACTION'; id: string }
  | { type: 'SET_HOVERED'; category: string | null; playerId: string }
  | { type: 'GAME_POUR' }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  phase: 'lobby',
  nickname: '',
  roomCode: null,
  players: [],
  dice: [],
  held: [false, false, false, false, false],
  rollCount: 0,
  currentPlayer: null,
  round: 1,
  scores: {},
  rankings: [],
  reactions: [],
  preview: {},
  hoveredCategory: null,
  pourCount: 0,
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_NICKNAME':
      return { ...state, nickname: action.nickname };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_ROOM':
      return { ...state, roomCode: action.roomCode, phase: 'room' };
    case 'SET_PLAYERS':
      return { ...state, players: action.players };
    case 'GAME_ROLLED':
      return { ...state, dice: action.dice, rollCount: action.rollCount, held: action.held ?? [false, false, false, false, false], preview: action.preview ?? {} };
    case 'GAME_HELD':
      return { ...state, held: action.held };
    case 'SET_TURN':
      return { ...state, currentPlayer: action.currentPlayer, round: action.round, rollCount: 0, held: [false, false, false, false, false], dice: [], preview: {}, hoveredCategory: null, pourCount: 0 };
    case 'SET_SCORES':
      return { ...state, scores: action.scores };
    case 'GAME_END':
      return { ...state, phase: 'result', rankings: action.rankings };
    case 'GAME_SYNC':
      return { ...state, dice: action.dice, held: action.held, rollCount: action.rollCount, scores: action.scores, currentPlayer: action.currentPlayer, round: action.round, phase: 'game', preview: action.preview ?? {} };
    case 'SET_HOVERED':
      return { ...state, hoveredCategory: { category: action.category, playerId: action.playerId } };
    case 'ADD_REACTION': {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return { ...state, reactions: [...state.reactions, { playerId: action.playerId, emoji: action.emoji, id }] };
    }
    case 'GAME_POUR':
      return { ...state, pourCount: state.pourCount + 1 };
    case 'CLEAR_REACTION':
      return { ...state, reactions: state.reactions.filter(r => r.id !== action.id) };
    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.playerId) };
    case 'RESET_GAME':
      return { ...initialState, nickname: state.nickname };
    default:
      return state;
  }
}

export function useGameState() {
  return useReducer(reducer, initialState);
}
