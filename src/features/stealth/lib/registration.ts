import { getUserRegistrationFunction } from '@umbra-privacy/sdk/registration';
import { getStealthClient, type UmbraClient } from '@/src/services/umbra/client';
import { createUserRegistrationProver } from '../zk/provers/register';

const registeredAddresses = new Set<string>();

async function registerWith(client: UmbraClient): Promise<void> {
  const addr = client.signer.address.toString();
  if (registeredAddresses.has(addr)) return;
  try {
    const zkProver = await createUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    await register({ confidential: true, anonymous: true });
    registeredAddresses.add(addr);
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? '';
    if (/already/i.test(msg)) {
      registeredAddresses.add(addr);
      return;
    }
    throw err;
  }
}

/** Register the active stealth wallet on the Umbra protocol. Idempotent. */
export async function ensureRegistered(): Promise<void> {
  const client = await getStealthClient();
  return registerWith(client);
}

/**
 * Register an arbitrary client (e.g. the bank wallet) on the Umbra protocol.
 * Required before any flow that needs the wallet's `EncryptedUserAccount` PDA
 * to exist — receiver-claimable UTXOs read the destination's `userCommitment`
 * from that PDA, and creating UTXOs in the mixer tree references the sender's
 * commitment too.
 */
export async function ensureRegisteredFor(client: UmbraClient): Promise<void> {
  return registerWith(client);
}

/**
 * Reset the in-memory registration cache — typically called on logout or
 * wallet switch so the next operation re-checks the on-chain state.
 */
export function clearRegistration(): void {
  registeredAddresses.clear();
}
