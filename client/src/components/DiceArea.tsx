import { useEffect, useRef, useCallback } from 'react';

interface DiceGameAPI {
  setValues(v: number[]): void;
  setHeld(h: boolean[]): void;
  shake(): void;
  roll(): void;
  getValues(): number[] | null;
  onResult(cb: (values: number[]) => void): void;
}

declare global {
  interface Window {
    DiceGame?: DiceGameAPI;
  }
}

interface Props {
  dice: number[];
  held: boolean[];
  rollPhase: 'idle' | 'shaking' | 'rolling' | 'settled';
  onHold: (index: number) => void;
  onSettled?: () => void;
}

export default function DiceArea({ dice, held, rollPhase, onHold, onSettled }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<DiceGameAPI | null>(null);
  const prevPhaseRef = useRef(rollPhase);

  const getAPI = useCallback(() => {
    if (apiRef.current) return apiRef.current;
    const win = iframeRef.current?.contentWindow as (Window & { DiceGame?: DiceGameAPI }) | null;
    if (win?.DiceGame) {
      apiRef.current = win.DiceGame;
      return apiRef.current;
    }
    return null;
  }, []);

  useEffect(() => {
    const check = setInterval(() => {
      const api = getAPI();
      if (api) {
        api.onResult(() => {
          onSettled?.();
        });
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, [getAPI, onSettled]);

  useEffect(() => {
    const api = getAPI();
    if (!api) return;

    if (rollPhase === 'shaking' && prevPhaseRef.current !== 'shaking') {
      api.setHeld(held);
      api.shake();
    }
    if (rollPhase === 'rolling' && prevPhaseRef.current !== 'rolling') {
      if (dice.length === 5) api.setValues(dice);
      api.roll();
    }
    prevPhaseRef.current = rollPhase;
  }, [rollPhase, dice, held, getAPI]);

  return (
    <div className="relative w-full aspect-[16/9] max-h-[40vh] rounded-xl overflow-hidden bg-gray-900">
      <iframe
        ref={iframeRef}
        src="/dice3d.html"
        className="w-full h-full border-0"
        title="3D Dice"
      />
      {rollPhase === 'settled' && dice.length === 5 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          {dice.map((d, i) => (
            <button
              key={i}
              onClick={() => onHold(i)}
              aria-label={`Dice ${i + 1}: ${d}${held[i] ? ' (held)' : ''}`}
              aria-pressed={held[i]}
              className={`w-12 h-12 rounded-lg text-lg font-bold transition-all focus-visible:ring-2 focus-visible:ring-white ${
                held[i]
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
