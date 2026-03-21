import { describe, it, expect } from 'vitest';
import { extractRoomCode } from './extractRoomCode';

describe('extractRoomCode', () => {
  it('returns plain room code as-is (uppercase)', () => {
    expect(extractRoomCode('ABCDEF')).toBe('ABCDEF');
    expect(extractRoomCode('abcdef')).toBe('ABCDEF');
  });

  it('extracts room code from full URL with ?room= param', () => {
    expect(extractRoomCode('https://example.com/?room=ABCDEF')).toBe('ABCDEF');
    expect(extractRoomCode('http://localhost:5173/?room=XYZ123')).toBe('XYZ123');
  });

  it('extracts room code from URL with multiple params', () => {
    expect(extractRoomCode('https://example.com/?foo=bar&room=ABCDEF&baz=1')).toBe('ABCDEF');
  });

  it('returns uppercase even when URL param is lowercase', () => {
    expect(extractRoomCode('https://example.com/?room=abcdef')).toBe('ABCDEF');
  });

  it('returns empty string for empty input', () => {
    expect(extractRoomCode('')).toBe('');
  });

  it('handles URL without room param - returns empty string', () => {
    expect(extractRoomCode('https://example.com/?other=value')).toBe('');
  });

  it('handles URL with trailing slash', () => {
    expect(extractRoomCode('https://example.com/game/?room=ABCDEF')).toBe('ABCDEF');
  });
});
