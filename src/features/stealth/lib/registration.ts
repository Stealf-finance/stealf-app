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

export async function ensureRegistered(): Promise<void> {
  const client = await getStealthClient();
  return registerWith(client);
}

export async function ensureRegisteredFor(client: UmbraClient): Promise<void> {
  return registerWith(client);
}

export function clearRegistration(): void {
  registeredAddresses.clear();
}
