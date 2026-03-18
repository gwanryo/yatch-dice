import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameState, GameAction } from '../hooks/useGameState';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (type: string, payload?: unknown) => void;
  playerId: string | null;
}

export default function RoomPage({ state, dispatch, send, playerId }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const me = state.players.find(p => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const isReady = me?.isReady ?? false;
  const allOthersReady = state.players.filter(p => p.id !== playerId).every(p => p.isReady || p.isHost);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">{t('app.title')}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-400">{t('room.code')}:</span>
            <span className="font-mono text-white text-xl tracking-widest">{state.roomCode}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.roomCode ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Copy room code"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </button>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur rounded-xl p-4 space-y-3">
          {state.players.map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{p.nickname}</span>
                {p.isHost && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">{t('room.host')}</span>}
                {p.id === playerId && <span className="text-xs text-purple-400">(me)</span>}
              </div>
              {!p.isHost && (
                <span className={`text-sm ${p.isReady ? 'text-green-400' : 'text-gray-500'}`}>
                  {p.isReady ? '\u2713 ' + t('room.ready') : '\u2026'}
                </span>
              )}
            </div>
          ))}
          {state.players.length < 2 && (
            <p className="text-center text-gray-500 text-sm py-2">{t('room.waitingForPlayers')}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { send('room:leave'); dispatch({ type: 'RESET_GAME' }); }}
            className="flex-1 bg-red-600/80 hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-white text-white py-3 rounded-lg font-bold transition-colors">
            {t('room.leave')}
          </button>
          {isHost ? (
            <button onClick={() => send('room:start')}
              disabled={state.players.length < 2 || !allOthersReady}
              className="flex-1 bg-green-600 hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 text-white py-3 rounded-lg font-bold transition-colors">
              {t('room.start')}
            </button>
          ) : (
            <button onClick={() => send('room:ready')}
              className={`flex-1 py-3 rounded-lg font-bold transition-colors focus-visible:ring-2 focus-visible:ring-white ${isReady ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {isReady ? t('room.cancel') : t('room.ready')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
