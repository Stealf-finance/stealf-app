import { describe, it, expect, vi } from 'vitest';
import {
  confirmSignature,
  ConfirmationTimeoutError,
  type SignatureStatusLike,
} from '../lib/confirmSignature';

const SIG = '5xTr4nSacT10nS1gnatur3';

/** Instant sleep so the polling loop doesn't spend real time. */
const noSleep = () => Promise.resolve();

/** Returns each queued status in turn, then `null` forever. */
function statusSequence(...statuses: (SignatureStatusLike | null)[]) {
  let i = 0;
  return vi.fn(async () => statuses[i++] ?? null);
}

describe('confirmSignature', () => {
  it('resolves once the transaction is confirmed', async () => {
    const fetchStatus = statusSequence({ confirmationStatus: 'confirmed' });

    await expect(
      confirmSignature(SIG, fetchStatus, { sleep: noSleep }),
    ).resolves.toBeUndefined();
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('resolves once the transaction is finalized', async () => {
    const fetchStatus = statusSequence({ confirmationStatus: 'finalized' });

    await expect(
      confirmSignature(SIG, fetchStatus, { sleep: noSleep }),
    ).resolves.toBeUndefined();
  });

  it('keeps polling while the status is still unknown', async () => {
    const fetchStatus = statusSequence(
      null,
      { confirmationStatus: 'processed' },
      { confirmationStatus: 'confirmed' },
    );

    await confirmSignature(SIG, fetchStatus, { sleep: noSleep });

    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it('throws when the chain reports the transaction failed', async () => {
    const fetchStatus = statusSequence({ err: { InstructionError: [0, 'X'] } });

    await expect(
      confirmSignature(SIG, fetchStatus, { sleep: noSleep }),
    ).rejects.toThrow(/Transaction failed/);
  });

  // A slot can report `confirmed` and still carry an err; the error wins.
  it('treats an err as failure even alongside a confirmed status', async () => {
    const fetchStatus = statusSequence({
      confirmationStatus: 'confirmed',
      err: { InstructionError: [0, 'X'] },
    });

    await expect(
      confirmSignature(SIG, fetchStatus, { sleep: noSleep }),
    ).rejects.toThrow(/Transaction failed/);
  });

  // Regression pin: the old loop fell through to `return signature` on timeout,
  // so a dropped transfer was reported to the user as a completed one.
  it('throws ConfirmationTimeoutError rather than reporting success', async () => {
    const fetchStatus = statusSequence(); // never settles

    await expect(
      confirmSignature(SIG, fetchStatus, { attempts: 3, sleep: noSleep }),
    ).rejects.toBeInstanceOf(ConfirmationTimeoutError);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it('carries the signature and a message that claims neither outcome', async () => {
    const err = await confirmSignature(SIG, statusSequence(), {
      attempts: 1,
      sleep: noSleep,
    }).then(
      () => null,
      (e: unknown) => e as ConfirmationTimeoutError,
    );

    expect(err).toBeInstanceOf(ConfirmationTimeoutError);
    if (!err) throw new Error('expected a rejection');
    expect(err.signature).toBe(SIG);
    expect(err.isConfirmationTimeout).toBe(true);
    expect(err.userMessage).toMatch(/taking longer than usual/i);
    // Must not assert failure — the transaction may still land.
    expect(err.userMessage).not.toMatch(/failed|cancell?ed/i);
  });

  it('does not sleep after a status that already settled', async () => {
    const sleep = vi.fn(() => Promise.resolve());

    await confirmSignature(
      SIG,
      statusSequence({ confirmationStatus: 'confirmed' }),
      {
        sleep,
      },
    );

    expect(sleep).not.toHaveBeenCalled();
  });
});
