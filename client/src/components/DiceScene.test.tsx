import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { createRef } from 'react';
import DiceScene from './DiceScene';
import type { DiceSceneAPI } from './DiceScene';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock WebGL support
beforeEach(() => {
  // Reset the cached WebGL check
  vi.restoreAllMocks();
});

const mockOnResult = vi.fn();
const mockApi: DiceSceneAPI = {
  setValues: vi.fn(),
  setHeld: vi.fn(),
  shake: vi.fn(),
  roll: vi.fn().mockReturnValue(true),
  onResult: mockOnResult,
};

vi.mock('./dice-scene/createDiceScene', () => ({
  createDiceScene: vi.fn().mockReturnValue({
    api: mockApi,
    cleanup: vi.fn(),
  }),
}));

describe('DiceScene', () => {
  beforeEach(() => {
    mockOnResult.mockClear();
    (mockApi.setValues as ReturnType<typeof vi.fn>).mockClear();
    (mockApi.setHeld as ReturnType<typeof vi.fn>).mockClear();

    // Mock canvas getContext to return truthy for WebGL check
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl') {
        return {} as WebGLRenderingContext;
      }
      return origGetContext.call(this, type as 'bitmaprenderer', ...(args as []));
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('forwards onResult to API after async load', async () => {
    const ref = createRef<DiceSceneAPI>();
    render(<DiceScene ref={ref} />);

    expect(ref.current).not.toBeNull();

    const callback = vi.fn();
    ref.current!.onResult(callback);

    // The dynamic import resolves on next microtask
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // After the API loads, the buffered callback should be forwarded
    expect(mockOnResult).toHaveBeenCalledWith(callback);
  });

  it('forwards onResult directly when API is already loaded', async () => {
    const ref = createRef<DiceSceneAPI>();
    render(<DiceScene ref={ref} />);

    // Wait for API to load
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    mockOnResult.mockClear();

    const callback = vi.fn();
    ref.current!.onResult(callback);

    // Should be forwarded immediately since API is loaded
    expect(mockOnResult).toHaveBeenCalledWith(callback);
  });
});
