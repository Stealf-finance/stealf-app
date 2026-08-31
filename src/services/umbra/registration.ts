import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk/query';
import { getUserRegistrationFunction } from '@umbra-privacy/sdk/registration';
import { getActiveClient, type UmbraClient } from './client';
import { createUserRegistrationProver } from './zk/provers/register';

const registered = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

export async function isFullyRegistered(client: UmbraClient): Promise<boolean> {
  const query = getUserAccountQuerierFunction({ client });
  const result = await query(client.signer.address);
  return result.state === 'exists' && result.data.isActiveForAnonymousUsage;
}

export async function checkRegistrationStatus(client: UmbraClient): Promise<void> {
  const query = getUserAccountQuerierFunction({ client });
  const result = await query(client.signer.address);

  if (result.state === "non_existent") {
    throw new Error("Not registered");
  }

  const { data } = result;

  if (!data.isUserAccountX25519KeyRegistered) {
    throw new Error("X25519 key not registered - re-run registration");
  }

  if (!data.isUserCommitmentRegistered) {
    throw new Error("Commitment not registered - re-run registration with anonymous: true");
  }

  if (!data.isActiveForAnonymousUsage) {
    throw new Error("not registered - anonymous usage not active yet");
  }
}

async function runRegistration(client: UmbraClient): Promise<void> {
  if (await isFullyRegistered(client)) return;

  const zkProver = await createUserRegistrationProver();
  const register = getUserRegistrationFunction({ client }, { zkProver });

  await register({ confidential: true, anonymous: true });
}

async function registerWith(client: UmbraClient): Promise<void> {
  const addr = client.signer.address.toString();
  if (registered.has(addr)) return;

  const pending = inFlight.get(addr);
  if (pending) return pending;

  const run = runRegistration(client)
    .then(() => {
      registered.add(addr);
    })
    .finally(() => {
      inFlight.delete(addr);
    });

  inFlight.set(addr, run);
  return run;
}

export async function ensureRegistered(): Promise<void> {
  return registerWith(await getActiveClient());
}

export async function ensureRegisteredFor(client: UmbraClient): Promise<void> {
  return registerWith(client);
}

export function clearRegistration(): void {
  registered.clear();
  inFlight.clear();
}
