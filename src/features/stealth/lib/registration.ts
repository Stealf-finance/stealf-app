import { getUserRegistrationFunction } from '@umbra-privacy/sdk';
import { getStealthClient } from '@/src/services/umbra/client';
import { createUserRegistrationProver } from '../zk/provers/register';

let registered = false;

/**
 * Make sure the active stealth wallet is registered with the Umbra protocol
 * on chain. Idempotent in-memory: subsequent calls in the same session no-op
 * once registration has succeeded (or the chain reports the user is already
 * registered).
 */
export async function ensureRegistered(): Promise<void> {
  if (registered) return;
  try {
    const client = await getStealthClient();
    const zkProver = await createUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    await register({ confidential: true, anonymous: true });
    registered = true;
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? '';
    if (/already/i.test(msg)) {
      registered = true;
      return;
    }
    throw err;
  }
}

/**
 * Reset the in-memory registration flag — typically called on logout or
 * wallet switch so the next operation re-checks the on-chain state.
 */
export function clearRegistration(): void {
  registered = false;
}
