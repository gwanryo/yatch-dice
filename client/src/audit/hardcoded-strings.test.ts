import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// A2: Components should not contain hardcoded English strings visible to users.
// All user-visible text must go through the i18n system.

const _dir = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(_dir, '..');

// Files to check for hardcoded strings
const COMPONENT_FILES = [
  'components/ScoreBoard.tsx',
  'components/DiceTray.tsx',
  'components/ReactionBar.tsx',
  'components/PageLayout.tsx',
  'pages/LobbyPage.tsx',
  'pages/RoomPage.tsx',
  'pages/GamePage.tsx',
  'pages/ResultPage.tsx',
];

describe('No hardcoded English strings in components', () => {
  for (const file of COMPONENT_FILES) {
    const filePath = resolve(SRC_ROOT, file);

    it(`${file} should not contain hardcoded "(me)" text`, () => {
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        return;
      }

      const lines = content.split('\n');
      const violations: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('import')) continue;
        if (/['"`]\s*\(me\)\s*['"`]/.test(line) || /\' \(me\)\'/.test(line) || /`.*\(me\)`/.test(line)) {
          violations.push(`Line ${i + 1}: ${line.trim()}`);
        }
      }

      expect(
        violations.length,
        `Found hardcoded "(me)" strings that should use i18n:\n${violations.join('\n')}`
      ).toBe(0);
    });
  }
});
