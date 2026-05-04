import { describe, expect, it } from 'vitest';
import type { Toast } from '../ToastContext';

// `useTopToast` is the small bit of business logic in this module worth
// testing without a React renderer. Mirrors the pure selection rule the
// hook uses: errors win over non-errors, then last-in-wins inside a class.
function pickTop(toasts: Toast[]): Toast | null {
  if (toasts.length === 0) return null;
  const errors = toasts.filter((t) => t.kind === 'error');
  if (errors.length > 0) return errors[errors.length - 1];
  return toasts[toasts.length - 1];
}

const toast = (id: string, kind: Toast['kind'], title = 't'): Toast => ({
  id,
  kind,
  title,
});

describe('pickTop (top-toast selection)', () => {
  it('returns null for empty queue', () => {
    expect(pickTop([])).toBeNull();
  });

  it('returns the only toast', () => {
    const t = toast('a', 'info');
    expect(pickTop([t])).toBe(t);
  });

  it('prefers an error over a newer info', () => {
    const errFirst = toast('a', 'error');
    const infoSecond = toast('b', 'info');
    expect(pickTop([errFirst, infoSecond])).toBe(errFirst);
  });

  it('prefers the newest error when multiple errors are queued', () => {
    const oldErr = toast('a', 'error');
    const info = toast('b', 'info');
    const newErr = toast('c', 'error');
    expect(pickTop([oldErr, info, newErr])).toBe(newErr);
  });

  it('returns the newest non-error when no errors are queued', () => {
    const info = toast('a', 'info');
    const success = toast('b', 'success');
    expect(pickTop([info, success])).toBe(success);
  });
});
