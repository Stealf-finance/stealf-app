import { Connection } from '@solana/web3.js';

/**
 * Poll a signature's on-chain status on the backend-supplied Reflect (mainnet)
 * RPC until it's confirmed — so we only record a STLF position for a mint/burn
 * that actually landed. Turnkey's signAndSendTransaction returns as soon as the
 * tx is broadcast, NOT when it confirms; without this, a dropped or reverted
 * tx would still create a phantom position and an optimistic success in the UI.
 *
 * Resolves `true` on a confirmed/finalized success, `false` on an on-chain error
 * or timeout. Never throws.
 */
export async function waitForSignatureConfirmation(
  rpcUrl: string,
  signature: string,
  { timeoutMs = 45_000, intervalMs = 1_500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<boolean> {
  let connection: Connection;
  try {
    connection = new Connection(rpcUrl, 'confirmed');
  } catch {
    return false;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value[0];
      if (status) {
        // A landed-but-failed tx must NOT be recorded as a position.
        if (status.err) return false;
        const level = status.confirmationStatus;
        if (level === 'confirmed' || level === 'finalized') return true;
      }
    } catch {
      // Transient RPC hiccup — keep polling until the deadline.
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
