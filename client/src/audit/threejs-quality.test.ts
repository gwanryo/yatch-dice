import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Three.js quality and best-practices compliance tests.
// Prevents regressions in texture handling, renderer setup, material
// performance, and resource cleanup.

const _dir = dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = resolve(_dir, '../..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(CLIENT_ROOT, relativePath), 'utf-8');
}

describe('Three.js Textures: Color Space', () => {
  it('pipTex should set colorSpace to SRGBColorSpace', () => {
    const content = readFile('src/components/dice-scene/textures.ts');
    // Find the pipTex function and check it sets colorSpace
    const pipTexFn = content.match(/export function pipTex[\s\S]*?^}/m)?.[0] ?? '';
    expect(
      pipTexFn.includes('SRGBColorSpace'),
      'pipTex (dice face color texture) must set colorSpace = SRGBColorSpace for correct gamma under ACESFilmicToneMapping'
    ).toBe(true);
  });

  it('noiseTex should set colorSpace to SRGBColorSpace for color textures', () => {
    const content = readFile('src/components/dice-scene/textures.ts');
    const noiseTexFn = content.match(/export function noiseTex[\s\S]*?^}/m)?.[0] ?? '';
    expect(
      noiseTexFn.includes('SRGBColorSpace'),
      'noiseTex (felt table color texture) must set colorSpace = SRGBColorSpace'
    ).toBe(true);
  });

  it('bumpTex should NOT set colorSpace (data texture)', () => {
    const content = readFile('src/components/dice-scene/textures.ts');
    const bumpTexFn = content.match(/export function bumpTex[\s\S]*?^}/m)?.[0] ?? '';
    expect(
      bumpTexFn.includes('SRGBColorSpace'),
      'bumpTex is a data texture and must NOT set SRGBColorSpace'
    ).toBe(false);
  });

  it('leatherTex should set colorSpace to SRGBColorSpace', () => {
    const content = readFile('src/components/dice-scene/textures.ts');
    const leatherTexFn = content.match(/export function leatherTex[\s\S]*?^}/m)?.[0] ?? '';
    expect(
      leatherTexFn.includes('SRGBColorSpace'),
      'leatherTex (cup color texture) must set colorSpace = SRGBColorSpace'
    ).toBe(true);
  });

  it('leatherBump should NOT set colorSpace (data texture)', () => {
    const content = readFile('src/components/dice-scene/textures.ts');
    const leatherBumpFn = content.match(/export function leatherBump[\s\S]*?^}/m)?.[0] ?? '';
    expect(
      leatherBumpFn.includes('SRGBColorSpace'),
      'leatherBump is a data texture and must NOT set SRGBColorSpace'
    ).toBe(false);
  });
});

describe('Three.js Textures: Caching', () => {
  it('all texture generators should use caching', () => {
    const content = readFile('src/components/dice-scene/textures.ts');

    const generators = ['pipTex', 'noiseTex', 'bumpTex', 'leatherTex', 'leatherBump'];
    for (const name of generators) {
      // Each generator should have a cache Map and check it before creating
      const fnMatch = content.match(new RegExp(`export function ${name}[\\s\\S]*?^}`, 'm'));
      expect(fnMatch, `${name} function not found`).not.toBeNull();
      const fn = fnMatch![0];
      expect(
        fn.includes('cached') || fn.includes('Cache'),
        `${name} should use a texture cache to prevent redundant GPU uploads`
      ).toBe(true);
    }
  });
});

describe('Three.js Renderer: Resize Handling', () => {
  it('onResize should update pixel ratio for multi-monitor support', () => {
    const content = readFile('src/components/dice-scene/setupRenderer.ts');
    const resizeFn = content.match(/const onResize[\s\S]*?};/)?.[0] ?? '';
    expect(
      resizeFn.includes('setPixelRatio'),
      'onResize must call renderer.setPixelRatio() to handle display changes (e.g., moving window between monitors with different DPR)'
    ).toBe(true);
  });
});

describe('Three.js Materials: Performance', () => {
  it('dice materials should toggle transparent dynamically based on opacity', () => {
    const content = readFile('src/components/dice-scene/createDiceScene.ts');
    // The updateDiceOpacity function should set transparent based on actual opacity
    const updateFn = content.match(/function updateDiceOpacity[\s\S]*?^  }/m)?.[0] ?? '';
    expect(
      updateFn.includes('m.transparent'),
      'updateDiceOpacity should toggle material.transparent based on actual opacity to avoid unnecessary alpha sorting when opacity is 1'
    ).toBe(true);
  });
});

describe('Three.js Cleanup: Thorough Disposal', () => {
  it('cleanup should dispose common texture map properties', () => {
    const content = readFile('src/components/dice-scene/createDiceScene.ts');
    const cleanupSection = content.slice(content.indexOf('const cleanup'));

    const requiredMaps = ['map', 'bumpMap', 'normalMap', 'roughnessMap'];
    for (const mapName of requiredMaps) {
      expect(
        cleanupSection.includes(mapName),
        `Cleanup should handle disposal of ${mapName} textures`
      ).toBe(true);
    }
  });
});
