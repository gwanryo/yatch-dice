import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

// A1: ConfirmDialog must trap focus within the modal
// When the dialog is open, pressing Tab should cycle focus only within
// the dialog elements (cancel + confirm buttons), not escape to elements behind.

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    message: 'Are you sure?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog content when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Are you sure?')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('closes on ESC key', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // A1: Focus trap — Tab should not escape the dialog
  it('traps focus within the dialog when Tab is pressed', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Outside Button</button>
        <ConfirmDialog {...defaultProps} />
      </div>
    );

    const cancelBtn = screen.getByText('Cancel');
    const confirmBtn = screen.getByText('Confirm');
    const outsideBtn = screen.getByText('Outside Button');

    // Focus should start on cancel (autoFocus)
    cancelBtn.focus();
    expect(document.activeElement).toBe(cancelBtn);

    // Tab to confirm
    await user.tab();
    expect(document.activeElement).toBe(confirmBtn);

    // Tab again should cycle back inside the dialog, not to "Outside Button"
    await user.tab();
    // Focus must NOT go to outside button
    expect(document.activeElement).not.toBe(outsideBtn);
    // It should wrap back to cancel button (focus trap)
    expect(document.activeElement === cancelBtn || document.activeElement === confirmBtn).toBe(true);
  });

  // Focus trap with Shift+Tab
  it('traps focus within the dialog when Shift+Tab is pressed', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Outside Button</button>
        <ConfirmDialog {...defaultProps} />
      </div>
    );

    const cancelBtn = screen.getByText('Cancel');
    const outsideBtn = screen.getByText('Outside Button');

    cancelBtn.focus();

    // Shift+Tab from first element should wrap to last element, not escape
    await user.tab({ shift: true });
    expect(document.activeElement).not.toBe(outsideBtn);
  });

  it('applies overscroll-behavior: contain to prevent background scroll', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.overscrollBehavior).toBe('contain');
  });

  it('applies danger variant styling to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('danger');
  });
});
