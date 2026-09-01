import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUmbraSigner } from '@umbra-privacy/sdk';
import {
  clearActiveSigner,
  hasActiveSigner,
  getActiveSigner,
  getActiveSignerAddress,
  setActiveSigner,
  subscribeToActiveSigner,
} from '@/src/services/umbra/signers/active';

// The module only imports `IUmbraSigner` as a type, so nothing native loads
// here. Only `.address` is ever read off the signer.
const signerFor = (address: string) =>
  ({ address: { toString: () => address } }) as unknown as IUmbraSigner;

describe('active signer', () => {
  beforeEach(() => {
    clearActiveSigner();
  });

  it('reports availability and hands the signer back', () => {
    expect(hasActiveSigner()).toBe(false);
    setActiveSigner(signerFor('abc'));
    expect(hasActiveSigner()).toBe(true);
    expect(getActiveSignerAddress()).toBe('abc');
  });

  it('throws rather than falling back when nothing is installed', () => {
    expect(() => getActiveSigner()).toThrow('Virtual bank account not ready');
  });

  it('notifies subscribers on install and on teardown', () => {
    const listener = vi.fn();
    subscribeToActiveSigner(listener);

    setActiveSigner(signerFor('abc'));
    expect(listener).toHaveBeenCalledTimes(1);

    clearActiveSigner();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToActiveSigner(listener);
    unsubscribe();

    setActiveSigner(signerFor('abc'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps the snapshot in step with what subscribers are told', () => {
    // useSyncExternalStore reads hasActiveSigner() after each notification;
    // the value must already be current by then, not updated afterwards.
    const seen: boolean[] = [];
    subscribeToActiveSigner(() => seen.push(hasActiveSigner()));

    setActiveSigner(signerFor('abc'));
    clearActiveSigner();

    expect(seen).toEqual([true, false]);
  });
});
