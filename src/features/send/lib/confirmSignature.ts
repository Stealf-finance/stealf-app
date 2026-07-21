/**
 * Confirmation polling for *public* Solana transfers.
 *
 * Both public send paths (bank via Turnkey, stealth via the local ED25519
 * signer) broadcast and then wait here. Broadcasting is not settling: Turnkey
 * resolves once the transaction is submitted, and `sendTransaction` returns as
 * soon as the RPC accepts it. Reporting either as success made a dropped
 * transfer indistinguishable from a settled one, and the UI then told the user
 * their money had moved.
 *
 * The Umbra encrypted send deliberately does *not* use this: it is queued and
 * can take minutes, and reports its state through the toast instead.
 *
 * Kept free of `@solana/kit` and React Native imports so it runs under Vitest —
 * the caller injects how to read a status.
 */

export interface SignatureStatusLike {
  err?: unknown;
  confirmationStatus?: string | null;
}

export type FetchSignatureStatus = (
  signature: string,
) => Promise<SignatureStatusLike | null>;

/**
 * Broadcast succeeded but the transfer had not confirmed within the window.
 * Distinct from a failure — the transaction may still land — so the copy claims
 * neither outcome. `SendFlow` surfaces `userMessage` verbatim.
 */
export class ConfirmationTimeoutError extends Error {
  isConfirmationTimeout = true;
  userMessage =
    'Your transfer was sent but is taking longer than usual to confirm. Check your history in a moment.';
  constructor(readonly signature: string) {
    super(`Transaction ${signature} not confirmed within the timeout`);
    this.name = 'ConfirmationTimeoutError';
  }
}

export const CONFIRM_ATTEMPTS = 30;
export const CONFIRM_INTERVAL_MS = 1500;

const defaultSleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export interface ConfirmOptions {
  attempts?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Resolves once the transaction is confirmed or finalized.
 *
 * @throws {Error} if the chain reports the transaction failed.
 * @throws {ConfirmationTimeoutError} if it never settles within the window.
 */
export async function confirmSignature(
  signature: string,
  fetchStatus: FetchSignatureStatus,
  {
    attempts = CONFIRM_ATTEMPTS,
    intervalMs = CONFIRM_INTERVAL_MS,
    sleep = defaultSleep,
  }: ConfirmOptions = {},
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const status = await fetchStatus(signature);
    // Check the error first: a slot can report `confirmed` *and* carry an err.
    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (
      status?.confirmationStatus === 'confirmed' ||
      status?.confirmationStatus === 'finalized'
    ) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new ConfirmationTimeoutError(signature);
}
