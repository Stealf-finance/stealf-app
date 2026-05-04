/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const getStringAsync = vi.fn<() => Promise<string>>();
const setStringAsync = vi.fn<(value: string) => Promise<boolean>>();

vi.mock('expo-clipboard', () => ({
  getStringAsync: () => getStringAsync(),
  setStringAsync: (value: string) => setStringAsync(value),
}));

import { scheduleClipboardClear } from '../clipboardAutoClear';

describe('scheduleClipboardClear', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getStringAsync.mockReset();
    setStringAsync.mockReset();
    setStringAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the clipboard after the configured delay when value still matches', async () => {
    getStringAsync.mockResolvedValue('secret-mnemonic');
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).toHaveBeenCalledTimes(1);
    expect(setStringAsync).toHaveBeenCalledWith('');
  });

  it('does not clear the clipboard when the user has copied something else', async () => {
    getStringAsync.mockResolvedValue('user-copied-something-else');
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).toHaveBeenCalledTimes(1);
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  it('cancels the timer when cancel() is called before delay elapses', async () => {
    getStringAsync.mockResolvedValue('secret-mnemonic');
    const cancel = scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });
    cancel();

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).not.toHaveBeenCalled();
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  it('swallows clipboard read errors without throwing', async () => {
    getStringAsync.mockRejectedValue(new Error('clipboard unavailable'));
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(setStringAsync).not.toHaveBeenCalled();
  });
});
