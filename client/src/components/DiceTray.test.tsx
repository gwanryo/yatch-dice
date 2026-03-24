import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiceTray from './DiceTray';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'aria.diceLabel') return `Dice ${opts?.index}: ${opts?.value}`;
      if (key === 'aria.diceHeld') return ' (held)';
      return key;
    },
  }),
}));

describe('DiceTray', () => {
  const defaultProps = {
    dice: [1, 2, 3, 4, 5],
    held: [false, false, false, false, false],
    rollCount: 1,
    isMyTurn: true,
    settled: true,
    onHold: vi.fn(),
  };

  it('renders empty dice slots when rollCount is 0', () => {
    const { container } = render(<DiceTray {...defaultProps} rollCount={0} />);
    expect(container.firstChild).not.toBeNull();
    // Empty slots are divs, not interactive buttons
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders dice buttons when rollCount > 0 and dice exist', () => {
    render(<DiceTray {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('shows dice faces (SVG pips) when settled is true', () => {
    const { container } = render(<DiceTray {...defaultProps} settled={true} />);
    const svgs = container.querySelectorAll('svg[viewBox="0 0 100 100"]');
    expect(svgs.length).toBe(5);
  });

  it('hides dice faces when settled is false and not held', () => {
    const { container } = render(<DiceTray {...defaultProps} settled={false} />);
    const svgs = container.querySelectorAll('svg[viewBox="0 0 100 100"]');
    expect(svgs.length).toBe(0);
  });

  it('shows dice face for held dice even when not settled', () => {
    const held = [true, false, false, false, false];
    const { container } = render(<DiceTray {...defaultProps} held={held} settled={false} />);
    const svgs = container.querySelectorAll('svg[viewBox="0 0 100 100"]');
    expect(svgs.length).toBe(1);
  });
});
