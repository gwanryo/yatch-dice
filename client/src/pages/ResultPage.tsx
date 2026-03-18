import { useTranslation } from 'react-i18next';
import type { GameState, GameAction } from '../hooks/useGameState';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (type: string, payload?: unknown) => void;
}

export default function ResultPage({ state, dispatch, send }: Props) {
  const { t } = useTranslation();
  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', ''];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-white text-center">{t('result.title')}</h1>
        <div className="space-y-3">
          {state.rankings.map((r, i) => (
            <div key={r.playerId}
              className={`flex items-center justify-between p-4 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-black/30'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{medals[i] ?? ''}</span>
                <div>
                  <p className="text-white font-bold">{r.nickname}</p>
                  <p className="text-gray-400 text-sm">{r.rank}{t('result.rank')}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{r.score}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { send('game:rematch'); }}
            className="flex-1 bg-green-600 hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-white text-white py-3 rounded-lg font-bold transition-colors">
            {t('result.rematch')}
          </button>
          <button onClick={() => { send('room:leave'); dispatch({ type: 'RESET_GAME' }); }}
            className="flex-1 bg-gray-600 hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-white text-white py-3 rounded-lg font-bold transition-colors">
            {t('result.backToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
