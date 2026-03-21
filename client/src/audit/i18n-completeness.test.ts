import { describe, it, expect } from 'vitest';
import en from '../i18n/en.json';
import ko from '../i18n/ko.json';
import ja from '../i18n/ja.json';

// A2, A6, D2: All i18n files must have identical key structures.
// Missing keys cause fallback to English or default strings,
// which breaks internationalization.

type NestedKeys = Record<string, unknown>;

function flattenKeys(obj: NestedKeys, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as NestedKeys, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('i18n key completeness', () => {
  const enKeys = flattenKeys(en);
  const koKeys = flattenKeys(ko);
  const jaKeys = flattenKeys(ja);

  it('English and Korean have the same keys', () => {
    const missingInKo = enKeys.filter(k => !koKeys.includes(k));
    const extraInKo = koKeys.filter(k => !enKeys.includes(k));
    expect(missingInKo, `Keys missing in ko.json: ${missingInKo.join(', ')}`).toEqual([]);
    expect(extraInKo, `Extra keys in ko.json: ${extraInKo.join(', ')}`).toEqual([]);
  });

  it('English and Japanese have the same keys', () => {
    const missingInJa = enKeys.filter(k => !jaKeys.includes(k));
    const extraInJa = jaKeys.filter(k => !enKeys.includes(k));
    expect(missingInJa, `Keys missing in ja.json: ${missingInJa.join(', ')}`).toEqual([]);
    expect(extraInJa, `Extra keys in ja.json: ${extraInJa.join(', ')}`).toEqual([]);
  });

  // A6: lobby.languageSelect key should exist in all languages
  it('has lobby.languageSelect key in all languages', () => {
    expect(enKeys).toContain('lobby.languageSelect');
    expect(koKeys).toContain('lobby.languageSelect');
    expect(jaKeys).toContain('lobby.languageSelect');
  });

  // A2: "me" label should be an i18n key, not hardcoded
  it('has a translation key for "me" label used in ScoreBoard and RoomPage', () => {
    expect(enKeys).toContain('game.me');
    expect(koKeys).toContain('game.me');
    expect(jaKeys).toContain('game.me');
  });

  it('no i18n value is an empty string', () => {
    function checkNoEmpty(obj: NestedKeys, file: string, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.length, `${file}:${path} is empty`).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          checkNoEmpty(value as NestedKeys, file, path);
        }
      }
    }
    checkNoEmpty(en, 'en.json');
    checkNoEmpty(ko, 'ko.json');
    checkNoEmpty(ja, 'ja.json');
  });
});
