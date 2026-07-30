import { getATAIntoETADirectDepositorFunction } from '@umbra-privacy/sdk/deposit';
import type { Address } from '@solana/kit';
import { getStealthClient } from '../client';
import { checkRegistrationStatus } from '@/src/services/umbra/registration';

export async function deposit(mint: Address, amount: bigint) {
  const client = await getStealthClient();
  await checkRegistrationStatus(client);
  const doDeposit = getATAIntoETADirectDepositorFunction({ client });
  return doDeposit(client.signer.address, mint, amount as any);
}
