import { describe, it, expect } from 'vitest';
import { calculateScore, isSpecialHand } from './scoreCalculator';

describe('calculateScore', () => {
  it('calculates ones', () => {
    expect(calculateScore([1, 1, 2, 3, 4], 'ones')).toBe(2);
  });

  it('calculates choice (sum of all)', () => {
    expect(calculateScore([1, 2, 3, 4, 5], 'choice')).toBe(15);
  });

  it('calculates fourOfAKind', () => {
    expect(calculateScore([3, 3, 3, 3, 5], 'fourOfAKind')).toBe(17);
    expect(calculateScore([1, 2, 3, 4, 5], 'fourOfAKind')).toBe(0);
  });

  it('calculates fullHouse', () => {
    expect(calculateScore([2, 2, 3, 3, 3], 'fullHouse')).toBe(25);
    expect(calculateScore([1, 2, 3, 4, 5], 'fullHouse')).toBe(0);
  });

  it('calculates smallStraight', () => {
    expect(calculateScore([1, 2, 3, 4, 6], 'smallStraight')).toBe(30);
    expect(calculateScore([1, 1, 2, 3, 5], 'smallStraight')).toBe(0);
  });

  it('calculates largeStraight', () => {
    expect(calculateScore([1, 2, 3, 4, 5], 'largeStraight')).toBe(40);
    expect(calculateScore([2, 3, 4, 5, 6], 'largeStraight')).toBe(40);
    expect(calculateScore([1, 2, 3, 4, 6], 'largeStraight')).toBe(0);
  });

  it('calculates yacht', () => {
    expect(calculateScore([5, 5, 5, 5, 5], 'yacht')).toBe(50);
    expect(calculateScore([5, 5, 5, 5, 4], 'yacht')).toBe(0);
  });
});

describe('isSpecialHand', () => {
  it('returns category and score for yacht (score > 0)', () => {
    const result = isSpecialHand([5, 5, 5, 5, 5], 'yacht');
    expect(result).toEqual({ category: 'yacht', score: 50 });
  });

  it('returns null for yacht with 0 score', () => {
    const result = isSpecialHand([1, 2, 3, 4, 5], 'yacht');
    expect(result).toBeNull();
  });

  it('returns null for non-special categories', () => {
    const result = isSpecialHand([1, 1, 1, 1, 1], 'ones');
    expect(result).toBeNull();
  });

  it('returns category and score for fullHouse', () => {
    const result = isSpecialHand([2, 2, 3, 3, 3], 'fullHouse');
    expect(result).toEqual({ category: 'fullHouse', score: 25 });
  });

  it('returns null for fullHouse with 0 score', () => {
    const result = isSpecialHand([1, 2, 3, 4, 5], 'fullHouse');
    expect(result).toBeNull();
  });
});
