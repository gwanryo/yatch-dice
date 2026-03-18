import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createDiceScene } from './dice-scene/createDiceScene';
import type { DiceSceneAPI } from './dice-scene/createDiceScene';

export type { DiceSceneAPI };

/* ── React Component ── */
const DiceScene = forwardRef<DiceSceneAPI>(function DiceScene(_, ref) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<DiceSceneAPI | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { api, cleanup } = createDiceScene(canvas);
    apiRef.current = api;
    cleanupRef.current = cleanup;

    return () => {
      cleanup();
      apiRef.current = null;
      cleanupRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setValues(v) { apiRef.current?.setValues(v); },
    setHeld(h) { apiRef.current?.setHeld(h); },
    shake() { apiRef.current?.shake(); },
    roll() { return apiRef.current?.roll() ?? false; },
    onResult(cb) { apiRef.current?.onResult(cb); },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      role="img"
      aria-label={t('aria.diceScene')}
    />
  );
});

export default DiceScene;
