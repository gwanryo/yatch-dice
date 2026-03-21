import { describe, it, expect, vi, beforeEach } from 'vitest';

// B2: Renderer should set outputColorSpace for correct sRGB rendering.
// C1: SpotLight should have decay=2 for physically correct falloff.
// C2: Shadow should use normalBias in addition to bias.

const spotLightArgs: unknown[][] = [];
const mockShadow = {
  mapSize: { set: vi.fn(), width: 0, height: 0 },
  camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
  bias: 0,
  normalBias: 0,
};

const mockRendererInstance = {
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  shadowMap: { enabled: false, type: 0 },
  toneMapping: 0,
  toneMappingExposure: 1,
  outputColorSpace: '',
  domElement: document.createElement('canvas'),
};

vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.background = null;
    this.add = vi.fn();
  }),
  PerspectiveCamera: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.position = { set: vi.fn() };
    this.lookAt = vi.fn();
    this.aspect = 1;
    this.updateProjectionMatrix = vi.fn();
  }),
  WebGLRenderer: vi.fn().mockImplementation(function () {
    return mockRendererInstance;
  }),
  AmbientLight: vi.fn().mockImplementation(function () { return {}; }),
  DirectionalLight: vi.fn().mockImplementation(function () {
    return {
      position: { set: vi.fn() },
      castShadow: false,
      shadow: mockShadow,
    };
  }),
  SpotLight: vi.fn().mockImplementation(function (...args: unknown[]) {
    spotLightArgs.push(args);
    return { position: { set: vi.fn() } };
  }),
  Color: vi.fn().mockImplementation(function () { return {}; }),
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 6,
  SRGBColorSpace: 'srgb',
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(function () {
    return {
      enableDamping: false,
      dampingFactor: 0,
      minPolarAngle: 0,
      maxPolarAngle: 0,
      minDistance: 0,
      maxDistance: 0,
      target: { set: vi.fn() },
    };
  }),
}));

describe('setupRenderer configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spotLightArgs.length = 0;
    mockShadow.bias = 0;
    mockShadow.normalBias = 0;
    mockRendererInstance.outputColorSpace = '';
  });

  it('B2: should set renderer.outputColorSpace to SRGBColorSpace', async () => {
    vi.resetModules();
    const { setupRenderer } = await import('./setupRenderer');
    const canvas = document.createElement('canvas');

    const result = setupRenderer(canvas);

    expect(
      result.renderer.outputColorSpace,
      'Renderer must set outputColorSpace = SRGBColorSpace for correct color rendering'
    ).toBe('srgb');
  });

  it('C1: SpotLight should have decay=2 for physically correct falloff', async () => {
    vi.resetModules();
    const { setupRenderer } = await import('./setupRenderer');
    const canvas = document.createElement('canvas');

    setupRenderer(canvas);

    expect(spotLightArgs.length).toBeGreaterThan(0);
    const lastCall = spotLightArgs[spotLightArgs.length - 1];
    // SpotLight(color, intensity, distance, angle, penumbra, decay)
    const decay = lastCall[5];
    expect(decay, 'SpotLight decay should be 2 for physically correct falloff').toBe(2);
  });

  it('C2: directional light shadow should set normalBias', async () => {
    vi.resetModules();
    const { setupRenderer } = await import('./setupRenderer');
    const canvas = document.createElement('canvas');

    setupRenderer(canvas);

    expect(
      mockShadow.normalBias,
      'shadow.normalBias should be set (e.g., 0.02) to prevent shadow acne'
    ).not.toBe(0);
  });

  it('should enable shadow mapping', async () => {
    vi.resetModules();
    const { setupRenderer } = await import('./setupRenderer');
    const canvas = document.createElement('canvas');

    const result = setupRenderer(canvas);

    expect(result.renderer.shadowMap.enabled).toBe(true);
  });

  it('should cap pixel ratio', async () => {
    vi.resetModules();
    const { setupRenderer } = await import('./setupRenderer');
    const canvas = document.createElement('canvas');

    setupRenderer(canvas);

    const pixelRatioCalls = mockRendererInstance.setPixelRatio.mock.calls;
    expect(pixelRatioCalls.length).toBe(1);
    const ratio = pixelRatioCalls[0][0] as number;
    expect(ratio).toBeLessThanOrEqual(3);
  });
});
