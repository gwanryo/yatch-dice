import { useRef, useEffect } from 'react';

interface Props {
  dice: number[];
  held: boolean[];
  rollCount: number;
  isMyTurn: boolean;
  settled: boolean;
  onHold: (index: number) => void;
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

function DiceFace({ value, size = 44 }: { value: number; size?: number }) {
  const pips = PIP_LAYOUTS[value] || [];
  const pipR = size * 0.09;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {pips.map(([cx, cy], j) => (
        <circle key={j} cx={cx} cy={cy} r={pipR / (size / 100)} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function DiceTray({ dice, held, rollCount, isMyTurn, settled, onHold }: Props) {
  const canInteract = isMyTurn && rollCount > 0 && settled;
  const prevHeldRef = useRef<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    prevHeldRef.current = held;
  }, [held]);

  if (rollCount === 0 || dice.length !== 5) return null;

  return (
    <div
      className="flex gap-2.5 justify-center px-4 py-3 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #3d2b1f, #5c4033)',
        border: '2px solid #7c5e4a',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {dice.map((d, i) => {
        const isHeld = held[i];
        const wasJustHeld = isHeld && !prevHeldRef.current[i];

        return (
          <button
            key={i}
            onClick={() => canInteract && onHold(i)}
            disabled={!canInteract}
            aria-label={`Dice ${i + 1}: ${d}${isHeld ? ' (held)' : ''}`}
            className={`
              relative w-12 h-12 rounded-lg flex items-center justify-center
              transition-all duration-300
              ${isHeld
                ? 'text-amber-900 shadow-lg scale-105'
                : settled
                  ? canInteract
                    ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur border border-white/20 cursor-pointer hover:scale-110'
                    : 'bg-white/10 text-white/60 border border-white/10'
                  : 'bg-white/5 text-white/30 border border-white/5'
              }
              ${wasJustHeld ? 'animate-dice-lock' : ''}
            `}
            style={isHeld ? {
              background: 'linear-gradient(145deg, #fef3c7, #fde68a)',
              border: '2px solid #f59e0b',
              boxShadow: '0 0 12px rgba(245,158,11,0.4), inset 0 1px 2px rgba(255,255,255,0.5)',
            } : undefined}
          >
            {(settled || isHeld) && <DiceFace value={d} size={44} />}
            {isHeld && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            )}
          </button>
        );
      })}

      <style>{`
        @keyframes dice-lock {
          0% { transform: scale(1); }
          40% { transform: scale(1.2); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1.05); }
        }
        .animate-dice-lock {
          animation: dice-lock 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
