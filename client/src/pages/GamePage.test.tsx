import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GamePage from './GamePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock DiceScene to avoid Three.js/WebGL in tests
vi.mock('../components/DiceScene', () => ({
  __esModule: true,
  default: vi.fn().mockReturnValue(null),
}));

// Mock ErrorBoundary to just render children
vi.mock('../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseState = {
  phase: 'game' as const,
  nickname: 'Me',
  roomCode: 'ABC123',
  players: [
    { id: 'me', nickname: 'Me', isHost: true, isReady: false },
    { id: 'other', nickname: 'Other', isHost: false, isReady: false },
  ],
  dice: [1, 2, 3, 4, 5],
  held: [false, false, false, false, false],
  rollCount: 3,
  currentPlayer: 'me',
  round: 1,
  scores: {},
  rankings: [],
  reactions: [],
  preview: {},
  hoveredCategory: null,
  pourCount: 0,
  rematchVotes: [],
  lastScored: null,
};

describe('GamePage button area', () => {
  it('shows "select score" prompt when all rolls used', () => {
    render(
      <GamePage state={baseState} dispatch={vi.fn()} send={vi.fn()} playerId="me" />,
    );
    expect(screen.getByText('game.selectScore')).toBeTruthy();
  });

  it('shows "opponent turn" text when not my turn', () => {
    render(
      <GamePage
        state={{ ...baseState, currentPlayer: 'other', rollCount: 0, dice: [] }}
        dispatch={vi.fn()} send={vi.fn()} playerId="me"
      />,
    );
    expect(screen.getByText('game.opponentTurn')).toBeTruthy();
  });

  it('shows shake button with rolls remaining on idle', () => {
    render(
      <GamePage
        state={{ ...baseState, rollCount: 0, dice: [] }}
        dispatch={vi.fn()} send={vi.fn()} playerId="me"
      />,
    );
    expect(screen.getByText('game.shake')).toBeTruthy();
  });
});
