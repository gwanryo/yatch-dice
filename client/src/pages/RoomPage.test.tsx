import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoomPage from './RoomPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

import { copyToClipboard } from '../utils/clipboard';

const mockDispatch = vi.fn();
const mockSend = vi.fn();
const defaultState = {
  phase: 'room' as const,
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

describe('RoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies room code and shows success icon on click', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    render(<RoomPage state={defaultState} dispatch={mockDispatch} send={mockSend} playerId="me" />);

    const copyButton = screen.getByLabelText('aria.copyRoomCode');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('ABC123');
    });
  });

  it('shows room code text', () => {
    render(<RoomPage state={defaultState} dispatch={mockDispatch} send={mockSend} playerId="me" />);
    expect(screen.getByText('ABC123')).toBeTruthy();
  });
});
