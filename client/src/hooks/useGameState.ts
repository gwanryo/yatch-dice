import { useReducer } from 'react';
import type {
  GamePhase, PlayerInfo, RoomListItem, RankEntry,
} from '../types/game';

export interface GameState {
  phase: GamePhase;
  nickname: string;
  roomCode: string | null;
  players: PlayerInfo[];
  roomList: RoomListItem[];
  dice: number[];
  held: boolean[];
  rollCount: number;
  currentPlayer: string | null;
  round: number;
  scores: Record<string, Record<string, number>>;
  rankings: RankEntry[];
  reactions: { playerId: string; emoji: string; ts: number }[];
}

export type GameAction =
  | { type: 'SET_NICKNAME'; nickname: string }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_ROOM'; roomCode: string }
  | { type: 'SET_PLAYERS'; players: PlayerInfo[] }
  | { type: 'SET_ROOM_LIST'; list: RoomListItem[] }
  | { type: 'GAME_ROLLED'; dice: number[]; held: boolean[]; rollCount: number }
  | { type: 'TOGGLE_HOLD'; index: number }
  | { type: 'SET_TURN'; currentPlayer: string; round: number }
  | { type: 'SET_SCORES'; scores: Record<string, Record<string, number>> }
  | { type: 'GAME_END'; rankings: RankEntry[] }
  | { type: 'GAME_SYNC'; dice: number[]; held: boolean[]; rollCount: number; scores: Record<string, Record<string, number>>; currentPlayer: string; round: number }
  | { type: 'ADD_REACTION'; playerId: string; emoji: string }
  | { type: 'CLEAR_REACTION'; ts: number }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  phase: 'lobby',
  nickname: '',
  roomCode: null,
  players: [],
  roomList: [],
  dice: [],
  held: [false, false, false, false, false],
  rollCount: 0,
  currentPlayer: null,
  round: 1,
  scores: {},
  rankings: [],
  reactions: [],
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
    case 'SET_ROOM_LIST':
      return { ...state, roomList: action.list };
    case 'GAME_ROLLED':
      return { ...state, dice: action.dice, rollCount: action.rollCount, held: action.held ?? [false, false, false, false, false] };
    case 'TOGGLE_HOLD': {
      if (state.rollCount === 0) return state;
      const newHeld = [...state.held];
      newHeld[action.index] = !newHeld[action.index];
      return { ...state, held: newHeld };
    }
    case 'SET_TURN':
      return { ...state, currentPlayer: action.currentPlayer, round: action.round, rollCount: 0, held: [false, false, false, false, false], dice: [] };
    case 'SET_SCORES':
      return { ...state, scores: action.scores };
    case 'GAME_END':
      return { ...state, phase: 'result', rankings: action.rankings };
    case 'GAME_SYNC':
      return { ...state, dice: action.dice, held: action.held, rollCount: action.rollCount, scores: action.scores, currentPlayer: action.currentPlayer, round: action.round, phase: 'game' };
    case 'ADD_REACTION':
      return { ...state, reactions: [...state.reactions, { playerId: action.playerId, emoji: action.emoji, ts: Date.now() }] };
    case 'CLEAR_REACTION':
      return { ...state, reactions: state.reactions.filter(r => r.ts !== action.ts) };
    case 'RESET_GAME':
      return { ...initialState, nickname: state.nickname };
    default:
      return state;
  }
}

export function useGameState() {
  return useReducer(reducer, initialState);
}
