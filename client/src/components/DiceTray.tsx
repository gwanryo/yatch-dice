import { useRef, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  dice: number[];
  held: boolean[];
  rollCount: number;
  isMyTurn: boolean;
  settled: boolean;
  onHold: (index: number) => void;
  action?: React.ReactNode;
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

const DiceFace = memo(function DiceFace({ value, size = 44 }: { value: number; size?: number }) {
  const pips = PIP_LAYOUTS[value] || [];
  const pipR = size * 0.09;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {pips.map(([cx, cy], j) => (
        <circle key={j} cx={cx} cy={cy} r={pipR / (size / 100)} fill="currentColor" />
      ))}
    </svg>
  );
});

export default memo(function DiceTray({ dice, held, rollCount, isMyTurn, settled, onHold, action }: Props) {
  const { t } = useTranslation();
  const canInteract = isMyTurn && rollCount > 0 && settled;
  const prevHeldRef = useRef<boolean[]>([false, false, false, false, false]);
  const justHeld = held.map((h, i) => h && !prevHeldRef.current[i]);

  useEffect(() => {
    prevHeldRef.current = held;
  }, [held]);

  const hasDice = rollCount > 0 && dice.length === 5;

  return (
    <div className="dice-tray flex items-stretch rounded-xl overflow-hidden">
      <div className="flex gap-2.5 justify-center px-4 py-3">
        {hasDice ? dice.map((d, i) => {
          const isHeld = held[i];
          const wasJustHeld = justHeld[i];

          return (
            <button
              key={i}
              onClick={() => canInteract && onHold(i)}
              disabled={!canInteract}
              aria-pressed={isHeld}
              aria-label={t('aria.diceLabel', { index: i + 1, value: d }) + (isHeld ? t('aria.diceHeld') : '')}
              className={`
                relative w-12 h-12 rounded-lg flex items-center justify-center
                transition-[transform,background-color,color,opacity,border-color,box-shadow] duration-300
                focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black
                ${isHeld
                  ? 'dice-held text-amber-900 scale-105'
                  : settled
                    ? canInteract
                      ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur border border-white/20 cursor-pointer hover:scale-110'
                      : 'bg-white/10 text-white/60 border border-white/10'
                    : 'bg-white/5 text-white/30 border border-white/5'
                }
                ${wasJustHeld ? 'animate-dice-lock' : ''}
              `}
            >
              {(settled || isHeld) && <DiceFace value={d} size={44} />}
              {isHeld && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              )}
            </button>
          );
        }) : (
          /* Empty dice slots before first roll */
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-white/5 border border-white/5" />
          ))
        )}
      </div>
      {action && (
        <>
          <div className="w-px bg-white/10 my-2 shrink-0" aria-hidden="true" />
          <div className="dice-tray-action flex items-center justify-center px-4 min-w-[70px] shrink-0">
            {action}
          </div>
        </>
      )}
    </div>
  );
});
