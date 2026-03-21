import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// B3: Texture functions should cache results to avoid creating duplicate textures.
// pipTex() is called 6 times per die × 5 dice = 30 calls, but only 6 unique values exist.
// Without caching, this wastes GPU memory and canvas creation time.

// Mock canvas 2d context since jsdom doesn't support it
const mockCtx = {
  fillStyle: '',
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(256 * 256 * 4),
  })),
  putImageData: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
};

const origCreateElement = document.createElement.bind(document);
let canvasTextureCount = 0;

beforeEach(() => {
  canvasTextureCount = 0;
  // Patch canvas getContext to return our mock
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = origCreateElement(tag);
    if (tag === 'canvas') {
      (el as HTMLCanvasElement).getContext = (() => mockCtx) as HTMLCanvasElement['getContext'];
    }
    return el;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock THREE.CanvasTexture — must use function (not arrow) to support `new`
vi.mock('three', () => ({
  CanvasTexture: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    canvasTextureCount++;
    this.wrapS = 0;
    this.wrapT = 0;
    this.colorSpace = '';
    this.repeat = { set: vi.fn() };
    this.dispose = vi.fn();
  }),
  RepeatWrapping: 1000,
  SRGBColorSpace: 'srgb',
}));

describe('Texture caching (B3)', () => {
  beforeEach(async () => {
    canvasTextureCount = 0;
    vi.resetModules();
    // Clear accumulated mock call records
    const { CanvasTexture } = await import('three');
    vi.mocked(CanvasTexture).mockClear();
  });

  it('pipTex should return cached texture for same value', async () => {
    const { pipTex } = await import('./textures');

    const tex1 = pipTex(3);
    const tex2 = pipTex(3);

    // Same value should return the exact same texture object (cached)
    expect(tex1).toBe(tex2);
  });

  it('pipTex should create different textures for different values', async () => {
    const { pipTex } = await import('./textures');

    const tex1 = pipTex(1);
    const tex6 = pipTex(6);

    expect(tex1).not.toBe(tex6);
  });

  it('pipTex should only create 6 CanvasTexture instances for 30 calls', async () => {
    const { pipTex } = await import('./textures');

    // Simulate 5 dice × 6 faces = 30 calls
    for (let die = 0; die < 5; die++) {
      for (let face = 1; face <= 6; face++) {
        pipTex(face);
      }
    }

    const { CanvasTexture } = await import('three');
    expect(
      vi.mocked(CanvasTexture).mock.calls.length,
      'pipTex should cache — 30 calls for 6 values should create only 6 textures'
    ).toBe(6);
  });
});

describe('Noise and bump texture caching', () => {
  beforeEach(async () => {
    canvasTextureCount = 0;
    vi.resetModules();
    const { CanvasTexture } = await import('three');
    vi.mocked(CanvasTexture).mockClear();
  });

  it('noiseTex should cache textures with same parameters', async () => {
    const { noiseTex } = await import('./textures');

    const tex1 = noiseTex('#2d5a27', 512, 15, 6);
    const tex2 = noiseTex('#2d5a27', 512, 15, 6);

    expect(tex1).toBe(tex2);
  });

  it('bumpTex should cache textures with same parameters', async () => {
    const { bumpTex } = await import('./textures');

    const tex1 = bumpTex(256, 40, 6);
    const tex2 = bumpTex(256, 40, 6);

    expect(tex1).toBe(tex2);
  });
});
