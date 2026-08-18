import { Keypair } from '@solana/web3.js';

/**
 * A throwaway keypair used for a single private-swap leg.
 *
 * Private-swap flow: the stealth wallet unshields funds (the swap amount + a
 * little SOL for gas) into this ephemeral address, the public Jupiter swap runs
 * from it, then the output is re-shielded back into the encrypted balance. The
 * ephemeral key is generated per swap, never reused, and never stored — so the
 * on-chain swap is not linkable to the user's stealth or bank identity.
 *
 * The key lives only in memory for the duration of the swap; there is nothing to
 * persist or clear afterwards (the account is drained by the re-shield leg).
 */
export function createEphemeralKeypair(): Keypair {
  return Keypair.generate();
}
