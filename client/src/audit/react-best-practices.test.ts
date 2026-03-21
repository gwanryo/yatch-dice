import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vercel React Best Practices compliance tests.

const _dir = dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = resolve(_dir, '../..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(CLIENT_ROOT, relativePath), 'utf-8');
}

describe('React: Eliminating Waterfalls', () => {
  it('pages should be lazy-loaded with Suspense boundaries', () => {
    const app = readFile('src/App.tsx');
    const pages = ['LobbyPage', 'RoomPage', 'GamePage', 'ResultPage'];

    for (const page of pages) {
      expect(app.includes(`lazy(() => import`) && app.includes(page)).toBe(true);
    }

    expect(app.includes('Suspense')).toBe(true);
  });
});

describe('React: Bundle Size', () => {
  it('three.js and cannon-es should be in separate chunks', () => {
    const viteConfig = readFile('vite.config.ts');
    expect(viteConfig.includes('manualChunks')).toBe(true);
    expect(viteConfig.includes('three')).toBe(true);
    expect(viteConfig.includes('cannon-es')).toBe(true);
  });

  it('DiceScene should use dynamic import for createDiceScene', () => {
    const diceScene = readFile('src/components/DiceScene.tsx');
    expect(
      diceScene.includes("import('./dice-scene/createDiceScene')"),
      'DiceScene should dynamically import createDiceScene'
    ).toBe(true);
  });
});

describe('React: Re-render Optimization', () => {
  // B1: Multiple dispatches in event handler cause double render
  it('room:state handler should use a single combined dispatch', () => {
    const content = readFile('src/hooks/useGameEvents.ts');

    // Extract only the room:state handler block (up to the next ws.on or closing bracket)
    const roomStateMatch = content.match(/ws\.on\('room:state'[^]*?\}\)/);
    if (roomStateMatch) {
      const handler = roomStateMatch[0];
      // Stop at the first closing `})` — that ends the handler
      const handlerBody = handler.split(/\}\)/)[0];
      const dispatchCalls = (handlerBody.match(/dispatch\(/g) || []).length;

      expect(
        dispatchCalls,
        'room:state dispatches SET_ROOM and SET_PLAYERS separately → double render. ' +
        'Combine into a single SET_ROOM_STATE action.'
      ).toBeLessThanOrEqual(1);
    }
  });

  it('heavy child components should be memoized', () => {
    const components = [
      { file: 'src/components/ScoreBoard.tsx', name: 'ScoreBoard' },
      { file: 'src/components/DiceTray.tsx', name: 'DiceTray' },
      { file: 'src/components/ReactionBar.tsx', name: 'ReactionBar' },
    ];

    for (const { file, name } of components) {
      const content = readFile(file);
      expect(
        content.includes('memo('),
        `${name} should be wrapped in React.memo`
      ).toBe(true);
    }
  });

  it('callbacks passed to children should use useCallback', () => {
    const gamePage = readFile('src/pages/GamePage.tsx');
    const callbackNames = ['handleScore', 'handleHold', 'handleReaction', 'handleReactionExpire', 'handleSettled'];

    for (const name of callbackNames) {
      expect(
        gamePage.includes(`const ${name} = useCallback`),
        `GamePage: ${name} should use useCallback`
      ).toBe(true);
    }
  });

  it('should not define components inside components', () => {
    const files = [
      'src/App.tsx',
      'src/pages/GamePage.tsx',
      'src/pages/LobbyPage.tsx',
      'src/pages/RoomPage.tsx',
      'src/pages/ResultPage.tsx',
    ];

    for (const file of files) {
      const content = readFile(file);
      const mainExportMatch = content.match(/export default function (\w+)/);
      if (mainExportMatch) {
        const mainName = mainExportMatch[1];
        const mainPos = content.indexOf(`export default function ${mainName}`);

        // Find any capitalized function declarations after the main export
        const afterExport = content.slice(mainPos);
        // Look for "function SomeComponent(" pattern inside the main function body
        const innerComponents = afterExport.match(/function\s+([A-Z]\w+)\s*\(/g) || [];

        // The main export itself matches, so subtract 1
        const actualInner = innerComponents.length - 1;
        expect(
          actualInner,
          `${file}: Found ${actualInner} component(s) defined inside ${mainName}`
        ).toBe(0);
      }
    }
  });
});

describe('React: Rendering Performance', () => {
  it('static JSX fallbacks should be hoisted outside components', () => {
    const gamePage = readFile('src/pages/GamePage.tsx');
    // sceneFallback should be declared before the component function (module-level)
    const sceneFallbackPos = gamePage.indexOf('const sceneFallback');
    const exportDefaultPos = gamePage.indexOf('export default function');

    expect(
      sceneFallbackPos,
      'GamePage should have a sceneFallback constant'
    ).toBeGreaterThanOrEqual(0);

    expect(
      sceneFallbackPos < exportDefaultPos,
      'sceneFallback should be hoisted to module level (before the component function) to avoid recreating JSX on every render'
    ).toBe(true);
  });

  it('should not use risky && patterns with potentially falsy non-boolean values', () => {
    const gamePage = readFile('src/pages/GamePage.tsx');

    // Check for patterns like {someArray.length && <Component />}
    // which renders "0" when length is 0
    const riskyPattern = /\{\s*\w+\.length\s*&&/g;
    const matches = gamePage.match(riskyPattern) || [];

    expect(
      matches.length,
      `GamePage: Found risky && pattern(s) that could render "0": ${matches.join(', ')}`
    ).toBe(0);
  });
});
