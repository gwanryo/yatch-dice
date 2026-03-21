import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DiceSceneAPI } from './dice-scene/createDiceScene';

export type { DiceSceneAPI };

let _webglSupported: boolean | null = null;
function checkWebGL(): boolean {
  if (_webglSupported !== null) return _webglSupported;
  try {
    const c = document.createElement('canvas');
    _webglSupported = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}

/* ── React Component ── */
const DiceScene = forwardRef<DiceSceneAPI>(function DiceScene(_, ref) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<DiceSceneAPI | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingOnResultRef = useRef<((values: number[]) => void) | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!checkWebGL()) {
      setWebglFailed(true);
      return;
    }

    let cancelled = false;
    import('./dice-scene/createDiceScene').then(({ createDiceScene }) => {
      if (cancelled) return;
      const { api, cleanup } = createDiceScene(canvas);
      apiRef.current = api;
      cleanupRef.current = cleanup;
      // Flush any callback registered before the API was ready
      if (pendingOnResultRef.current) {
        api.onResult(pendingOnResultRef.current);
        pendingOnResultRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      apiRef.current = null;
      cleanupRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setValues(v) { apiRef.current?.setValues(v); },
    setHeld(h) { apiRef.current?.setHeld(h); },
    shake() { apiRef.current?.shake(); },
    roll() { return apiRef.current?.roll() ?? false; },
    onResult(cb) {
      if (apiRef.current) {
        apiRef.current.onResult(cb);
      } else {
        pendingOnResultRef.current = cb;
      }
    },
  }));

  if (webglFailed) {
    return (
      <div
        className="fixed inset-0 bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center"
        style={{ zIndex: 0 }}
        role="img"
        aria-label={t('aria.diceScene')}
      >
        <p className="text-white/50 text-sm">{t('error.webglNotSupported')}</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, touchAction: 'none' }}
      role="img"
      aria-label={t('aria.diceScene')}
    />
  );
});

export default DiceScene;
