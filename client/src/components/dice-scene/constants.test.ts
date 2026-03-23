import { describe, it, expect } from 'vitest';
import {
  COL_FLY, COL_STAGGER, LIFT_DUR,
  SHAKE_SWIRL_SPEED, SHAKE_CIRCLE_R, SHAKE_CIRCLE_R_VAR,
  SHAKE_TILT_BASE, SHAKE_BOUNCE_AMP,
  SHAKE_NUDGE_INTERVAL, SHAKE_NUDGE_FORCE,
  CUP_BR, CUP_TR, CUP_H, DICE_HALF,
} from './constants';

describe('dice animation speed constants', () => {
  it('collection flight time should be snappy (≤ 500ms)', () => {
    expect(COL_FLY).toBeLessThanOrEqual(500);
  });

  it('collection stagger between dice should be short (≤ 100ms)', () => {
    expect(COL_STAGGER).toBeLessThanOrEqual(100);
  });

  it('lift duration should be fast (≤ 400ms)', () => {
    expect(LIFT_DUR).toBeLessThanOrEqual(400);
  });

  it('shake swirl speed should be fast enough (≥ 0.012)', () => {
    expect(SHAKE_SWIRL_SPEED).toBeGreaterThanOrEqual(0.012);
  });

  it('shake circle radius should give energetic movement (≥ 0.6)', () => {
    expect(SHAKE_CIRCLE_R).toBeGreaterThanOrEqual(0.6);
  });

  it('shake tilt should be noticeable (≥ 0.28)', () => {
    expect(SHAKE_TILT_BASE).toBeGreaterThanOrEqual(0.28);
  });

  it('shake bounce amplitude should be visible (≥ 0.12)', () => {
    expect(SHAKE_BOUNCE_AMP).toBeGreaterThanOrEqual(0.12);
  });

  it('shake nudge should happen frequently (≤ 500ms interval)', () => {
    expect(SHAKE_NUDGE_INTERVAL).toBeLessThanOrEqual(500);
  });

  it('shake nudge force should be impactful (≥ 0.18)', () => {
    expect(SHAKE_NUDGE_FORCE).toBeGreaterThanOrEqual(0.18);
  });
});

describe('cup containment safety', () => {
  it('cup top radius should be larger than bottom (room for dice)', () => {
    expect(CUP_TR).toBeGreaterThan(CUP_BR);
  });

  it('dice should fit inside cup bottom with margin', () => {
    // 5 dice in circle: each needs DICE_SIZE diameter, circle needs enough radius
    const minR = DICE_HALF * 2 + 0.3; // at least 2 dice widths + margin
    expect(CUP_BR).toBeGreaterThanOrEqual(minR);
  });

  it('cup height should be tall enough to contain bouncing dice', () => {
    expect(CUP_H).toBeGreaterThanOrEqual(2.5);
  });
});
