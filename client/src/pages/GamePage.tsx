import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DiceScene from '../components/DiceScene';
import type { DiceSceneAPI } from '../components/DiceScene';
import DiceTray from '../components/DiceTray';
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
  const sceneRef = useRef<DiceSceneAPI>(null);

  const handleShake = () => {
    if (!isMyTurn || state.rollCount >= 3) return;
    setRollPhase('shaking');
    send('game:roll');
  };

  const handleRoll = () => {
    if (rollPhase !== 'shaking') return;
    const ok = sceneRef.current?.roll();
    if (ok) {
      setRollPhase('rolling');
      send('game:pour');
    }
  };

  // Trigger animation when dice values arrive
  useEffect(() => {
    if (state.rollCount > prevRollCountRef.current && state.dice.length === 5) {
      const api = sceneRef.current;
      if (api) {
        api.setHeld(state.held);
        api.setValues(state.dice);
        api.shake();
        setRollPhase('shaking');
      }
    }
    prevRollCountRef.current = state.rollCount;
  }, [state.rollCount, state.dice, state.held, isMyTurn]);

  // Remote players: roll when active player clicks Roll (game:pour)
  const prevPourRef = useRef(state.pourCount);
  useEffect(() => {
    if (state.pourCount > prevPourRef.current && !isMyTurn) {
      sceneRef.current?.roll();
      setRollPhase('rolling');
    }
    prevPourRef.current = state.pourCount;
  }, [state.pourCount, isMyTurn]);

  // Sync held state to 3D scene whenever it changes (e.g. from game:held)
  useEffect(() => {
    sceneRef.current?.setHeld(state.held);
  }, [state.held]);

  // Reset rollPhase when turn changes
  useEffect(() => {
    setRollPhase('idle');
    prevRollCountRef.current = 0;
  }, [state.currentPlayer]);

  const handleSettled = useCallback(() => {
    setRollPhase('settled');
  }, []);

  useEffect(() => {
    sceneRef.current?.onResult(handleSettled);
  }, [handleSettled]);

  const handleScore = useCallback((category: Category) => {
    send('game:score', { category });
    setRollPhase('idle');
  }, [send]);

  const handleHold = useCallback((index: number) => {
    send('game:hold', { index });
  }, [send]);

  const lastHoverRef = useRef(0);
  const handleHoverCategory = useCallback((category: string | null) => {
    const now = Date.now();
    if (category !== null && now - lastHoverRef.current < 200) return;
    lastHoverRef.current = now;
    send('game:hover', { category });
  }, [send]);

  const handleReaction = useCallback((emoji: string) => {
    send('reaction:send', { emoji });
  }, [send]);

  const handleReactionExpire = useCallback((id: string) => {
    dispatch({ type: 'CLEAR_REACTION', id });
  }, [dispatch]);

  const currentNick = useMemo(
    () => state.players.find(p => p.id === state.currentPlayer)?.nickname ?? '',
    [state.players, state.currentPlayer],
  );

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Accessible heading for screen readers */}
      <h1 className="sr-only">{t('app.title')} - {t('game.round')} {state.round}/12</h1>

      {/* 3D Scene — fullscreen background */}
      <DiceScene ref={sceneRef} />

      {/* UI Overlay */}
      <main id="main-content" className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Top bar — turn indicator */}
        <header className={`pointer-events-auto flex justify-between items-center px-4 py-2.5 transition-[color,background-color,box-shadow] duration-300 ${
          isMyTurn
            ? 'bg-gradient-to-r from-yellow-600/80 via-amber-500/80 to-yellow-600/80 shadow-lg shadow-yellow-500/20'
            : 'bg-black/40 backdrop-blur-sm'
        }`}>
          <span className="text-white font-bold tabular-nums">
            {t('game.round')} {state.round}/12
          </span>
          <span className={`text-sm font-bold ${isMyTurn ? 'text-white' : 'text-gray-300'}`} aria-live="polite">
            {isMyTurn ? t('game.yourTurn') : t('game.waitingTurn', { name: currentNick })}
          </span>
          <span className="text-white/70 text-sm tabular-nums">
            {t('game.rollsLeft')}: {3 - state.rollCount}
          </span>
        </header>

        {/* Main area */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Spacer for 3D scene */}
          <div className="flex-1" />

          {/* ScoreBoard — right sidebar on desktop, top overlay on mobile */}
          <div className="pointer-events-auto w-full lg:w-80 p-2 lg:p-4 order-first lg:order-last">
            <ScoreBoard
              players={state.players}
              scores={state.scores}
              currentPlayer={state.currentPlayer}
              myId={playerId}
              rollCount={state.rollCount}
              preview={state.preview}
              hoveredCategory={state.hoveredCategory}
              minimized={rollPhase === 'shaking' || rollPhase === 'rolling'}
              onSelectCategory={isMyTurn && state.rollCount > 0 ? handleScore : undefined}
              onHoverCategory={isMyTurn && state.rollCount > 0 ? handleHoverCategory : undefined}
            />
          </div>
        </div>

        {/* Bottom area — dice tray + buttons */}
        <div className="pointer-events-auto flex flex-col items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] px-2">
          <DiceTray
            dice={state.dice}
            held={state.held}
            rollCount={state.rollCount}
            isMyTurn={isMyTurn}
            settled={rollPhase === 'settled' || rollPhase === 'idle'}
            onHold={handleHold}
          />
          <div className="flex gap-4">
            {rollPhase === 'shaking' && isMyTurn && (
              <button onClick={handleRoll}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 active:scale-[0.97] text-white font-bold rounded-xl text-lg transition-[colors,transform] focus-visible:ring-2 focus-visible:ring-white shadow-lg">
                {t('game.rollDice')}
              </button>
            )}
            {rollPhase !== 'shaking' && rollPhase !== 'rolling' && (
              <button onClick={handleShake}
                disabled={!isMyTurn || state.rollCount >= 3}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-40 text-white font-bold rounded-xl text-lg transition-[colors,transform] focus-visible:ring-2 focus-visible:ring-white shadow-lg">
                {t('game.shake')}
                {state.rollCount > 0 && ` (${3 - state.rollCount})`}
              </button>
            )}
          </div>
          <ReactionBar
            onSend={handleReaction}
            reactions={state.reactions}
            onExpire={handleReactionExpire}
            players={state.players}
          />
        </div>
      </main>
    </div>
  );
}
