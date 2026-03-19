import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import type { GameState, GameAction } from '../hooks/useGameState';

const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const CONFETTI_DATA = Array.from({ length: 40 }, (_, i) => ({
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 2}s`,
  duration: `${2.5 + Math.random() * 2}s`,
  color: CONFETTI_COLORS[i % 6],
  rotation: `rotate(${Math.random() * 360}deg)`,
}));

function ConfettiParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {CONFETTI_DATA.map((c, i) => (
        <div
          key={i}
          className="absolute animate-confetti-fall"
          style={{ left: c.left, animationDelay: c.delay, animationDuration: c.duration }}
        >
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: c.color, transform: c.rotation }}
          />
        </div>
      ))}
    </div>
  );
}

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (type: string, payload?: unknown) => void;
}

export default function ResultPage({ state, dispatch, send }: Props) {
  const { t } = useTranslation();
  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', ''];
  const [revealed, setRevealed] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Stagger ranking reveals
  useEffect(() => {
    if (revealed < state.rankings.length) {
      const timer = setTimeout(() => setRevealed(prev => prev + 1), 400);
      return () => clearTimeout(timer);
    } else if (revealed === state.rankings.length && state.rankings.length > 0) {
      // Show confetti after all revealed
      const timer = setTimeout(() => setShowConfetti(true), 200);
      return () => clearTimeout(timer);
    }
  }, [revealed, state.rankings.length]);

  const handleLeave = () => {
    send('room:leave');
    dispatch({ type: 'RESET_GAME' });
  };

  return (
    <PageLayout className="relative overflow-hidden">
      {/* Confetti particles */}
      {showConfetti && <ConfettiParticles />}

      <div className="w-full max-w-md space-y-6 relative z-10">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-center drop-shadow-lg">
          {t('result.title')}
        </h1>
        <div className="space-y-3">
          {state.rankings.map((r, i) => (
            <div
              key={r.playerId}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${
                i < revealed
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              } ${
                i === 0
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : i === 1
                    ? 'bg-gradient-to-r from-gray-400/10 to-gray-300/5 border-gray-400/20'
                    : i === 2
                      ? 'bg-gradient-to-r from-orange-700/10 to-orange-600/5 border-orange-700/20'
                      : 'bg-black/30 border-white/5'
              }`}
              style={{ transitionDelay: `${i * 400}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{medals[i] ?? ''}</span>
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{r.nickname}</p>
                  <p className="text-gray-400 text-sm">{t('result.rankLabel', { rank: r.rank })}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white tabular-nums shrink-0">{r.score}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { send('game:rematch'); }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white text-white py-3 rounded-lg font-bold transition-[colors,transform] shadow-lg shadow-emerald-900/50">
            {t('result.rematch')}
          </button>
          <button onClick={handleLeave}
            className="flex-1 bg-gray-700 hover:bg-gray-600 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white text-white py-3 rounded-lg font-bold transition-[colors,transform]">
            {t('result.backToLobby')}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
