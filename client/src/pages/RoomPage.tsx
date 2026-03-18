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
  const me = state.players.find(p => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const isReady = me?.isReady ?? false;
  const allOthersReady = state.players.filter(p => p.id !== playerId).every(p => p.isReady || p.isHost);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">{t('app.title')}</h1>
          <p className="text-gray-400">{t('room.code')}: <span className="font-mono text-white text-xl tracking-widest">{state.roomCode}</span></p>
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
