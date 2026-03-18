import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DiceArea from '../components/DiceArea';
import ScoreBoard from '../components/ScoreBoard';
import ReactionBar from '../components/ReactionBar';
import type { GameState, GameAction } from '../hooks/useGameState';
import type { Category } from '../types/game';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (type: string, payload?: unknown) => void;
  playerId: string | null;
}

export default function GamePage({ state, dispatch, send, playerId }: Props) {
  const { t } = useTranslation();
  const isMyTurn = state.currentPlayer === playerId;
  const [rollPhase, setRollPhase] = useState<'idle' | 'shaking' | 'rolling' | 'settled'>('idle');
  const prevRollCountRef = useRef(state.rollCount);

  const handleShake = () => {
    if (!isMyTurn || state.rollCount >= 3) return;
    setRollPhase('shaking');
    const held: number[] = [];
    state.held.forEach((h, i) => { if (h) held.push(i); });
    send('game:roll', { held });
  };

  const handleRoll = () => {
    if (rollPhase !== 'shaking') return;
    setRollPhase('rolling');
  };

  // Trigger animation when another player rolls (rollCount increased)
  useEffect(() => {
    if (!isMyTurn && state.rollCount > prevRollCountRef.current && state.dice.length === 5) {
      setRollPhase('shaking');
      // Auto-roll for spectators after a delay
      const timer = setTimeout(() => setRollPhase('rolling'), 1200);
      return () => clearTimeout(timer);
    }
    prevRollCountRef.current = state.rollCount;
  }, [state.rollCount, state.dice, isMyTurn]);

  // Reset rollPhase when turn changes
  useEffect(() => {
    setRollPhase('idle');
    prevRollCountRef.current = 0;
  }, [state.currentPlayer]);

  const handleSettled = useCallback(() => {
    setRollPhase('settled');
  }, []);

  const handleScore = (category: Category) => {
    send('game:score', { category });
    setRollPhase('idle');
  };

  const handleReaction = (emoji: string) => {
    send('reaction:send', { emoji });
  };

  const currentNick = state.players.find(p => p.id === state.currentPlayer)?.nickname ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-black/30">
        <span className="text-white font-bold tabular-nums">{t('game.round')} {state.round}/13</span>
        <span className={`text-sm ${isMyTurn ? 'text-yellow-300 font-bold' : 'text-gray-400'}`} aria-live="polite">
          {isMyTurn ? t('game.yourTurn') : currentNick + t('game.waitingTurn')}
        </span>
        <span className="text-gray-400 text-sm tabular-nums">{t('game.rollsLeft')}: {3 - state.rollCount}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <DiceArea
            dice={state.dice}
            held={state.held}
            rollPhase={rollPhase}
            onHold={isMyTurn ? (i) => dispatch({ type: 'TOGGLE_HOLD', index: i }) : () => {}}
            onSettled={handleSettled}
          />
          <div className="flex justify-center gap-4">
            {rollPhase === 'shaking' && isMyTurn && (
              <button onClick={handleRoll}
                disabled={state.dice.length !== 5}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-xl text-lg transition-colors focus-visible:ring-2 focus-visible:ring-white">
                Roll!
              </button>
            )}
            {rollPhase !== 'shaking' && rollPhase !== 'rolling' && (
              <button onClick={handleShake}
                disabled={!isMyTurn || state.rollCount >= 3}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-xl text-lg transition-colors focus-visible:ring-2 focus-visible:ring-white">
                {t('game.shake')}
                {state.rollCount > 0 && ` (${3 - state.rollCount})`}
              </button>
            )}
          </div>
        </div>

        <div className="lg:w-80">
          <ScoreBoard
            players={state.players}
            scores={state.scores}
            currentPlayer={state.currentPlayer}
            myId={playerId}
            rollCount={state.rollCount}
            onSelectCategory={isMyTurn && state.rollCount > 0 ? handleScore : undefined}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <ReactionBar
          onSend={handleReaction}
          reactions={state.reactions}
          onExpire={(ts) => dispatch({ type: 'CLEAR_REACTION', ts })}
          players={state.players}
        />
      </div>
    </div>
  );
}
