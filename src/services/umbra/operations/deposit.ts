import { getATAIntoETADirectDepositorFunction } from '@umbra-privacy/sdk/deposit';
import type { Address } from '@solana/kit';
import { getActiveClient } from '../client';
import { checkRegistrationStatus } from '@/src/services/umbra/registration';

export async function deposit(mint: Address, amount: bigint) {
  const client = await getActiveClient();
  await checkRegistrationStatus(client);
  const doDeposit = getATAIntoETADirectDepositorFunction({ client });
  return doDeposit(client.signer.address, mint, amount as any);
}
