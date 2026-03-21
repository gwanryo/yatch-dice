import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultPage from './ResultPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const baseState = {
  phase: 'result' as const,
  nickname: 'Me',
  roomCode: 'ABC123',
  players: [
    { id: 'me', nickname: 'Me', isHost: true, isReady: false },
    { id: 'other', nickname: 'Other', isHost: false, isReady: false },
  ],
  dice: [],
  held: [false, false, false, false, false],
  rollCount: 0,
  currentPlayer: null,
  round: 12,
  scores: {},
  rankings: [
    { playerId: 'me', nickname: 'Me', score: 200, rank: 1 },
    { playerId: 'other', nickname: 'Other', score: 150, rank: 2 },
  ],
  reactions: [],
  preview: {},
  hoveredCategory: null,
  pourCount: 0,
  rematchVotes: [],
  lastScored: null,
};

describe('ResultPage rematch button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rematch button is enabled when I have not voted', () => {
    render(<ResultPage state={baseState} dispatch={vi.fn()} send={vi.fn()} playerId="me" />);
    const buttons = screen.getAllByRole('button');
    const rematchBtn = buttons.find(b => b.textContent?.includes('result.rematch'));
    expect(rematchBtn).toBeTruthy();
    expect(rematchBtn!.disabled).toBe(false);
  });

  it('rematch button stays enabled when only OTHER player voted', () => {
    render(
      <ResultPage
        state={{ ...baseState, rematchVotes: ['other'] }}
        dispatch={vi.fn()} send={vi.fn()} playerId="me"
      />,
    );
    const buttons = screen.getAllByRole('button');
    const rematchBtn = buttons.find(b => b.textContent?.includes('result.rematch'));
    expect(rematchBtn!.disabled).toBe(false);
  });

  it('rematch button is disabled when I voted', () => {
    render(
      <ResultPage
        state={{ ...baseState, rematchVotes: ['me'] }}
        dispatch={vi.fn()} send={vi.fn()} playerId="me"
      />,
    );
    const buttons = screen.getAllByRole('button');
    const rematchBtn = buttons.find(b => b.textContent?.includes('result.rematch'));
    expect(rematchBtn!.disabled).toBe(true);
  });

  it('sends game:rematch when clicking rematch', () => {
    const send = vi.fn();
    render(<ResultPage state={baseState} dispatch={vi.fn()} send={send} playerId="me" />);
    const buttons = screen.getAllByRole('button');
    const rematchBtn = buttons.find(b => b.textContent?.includes('result.rematch'));
    fireEvent.click(rematchBtn!);
    expect(send).toHaveBeenCalledWith('game:rematch');
  });
});
