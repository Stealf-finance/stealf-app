import type { IUmbraSigner } from '@umbra-privacy/sdk';

/**
 * Umbra's service layer (`operations/`, `queries/`, `registration.ts`) is plain
 * async code with no React context, but the only signer left is Turnkey's — and
 * `signTransaction` / `signMessage` only exist inside `useTurnkey()`. This
 * module is the bridge: `useUmbra` installs the signer once Turnkey has
 * hydrated its wallet accounts, and every non-React caller reads it back here.
 *
 * There is deliberately no fallback. An absent signer means Turnkey has not
 * finished hydrating yet — callers must surface that and let the user retry,
 * never sign with anything else (hard rule #3: the bank wallet's key lives in
 * Turnkey's TEEs and the client never sees it).
 */

let activeSigner: IUmbraSigner | null = null;

/** Install the Turnkey-backed signer. Idempotent per address. */
export function setActiveSigner(signer: IUmbraSigner): void {
  activeSigner = signer;
}

export function clearActiveSigner(): void {
  activeSigner = null;
}

/** True once Turnkey has hydrated and the signer is usable. */
export function hasActiveSigner(): boolean {
  return activeSigner !== null;
}

export function getActiveSigner(): IUmbraSigner {
  if (!activeSigner) {
    throw new Error('Virtual bank account not ready');
  }
  return activeSigner;
}

/** Address the active signer signs for, or null before Turnkey hydrates. */
export function getActiveSignerAddress(): string | null {
  return activeSigner ? activeSigner.address.toString() : null;
}
