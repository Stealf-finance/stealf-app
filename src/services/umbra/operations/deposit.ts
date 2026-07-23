import { getATAIntoETADirectDepositorFunction } from '@umbra-privacy/sdk/deposit';
import type { Address } from '@solana/kit';
import { getStealthClient } from '../client';
import { ensureRegistered } from '@/src/features/stealth/lib/registration';

export async function deposit(mint: Address, amount: bigint) {
  await ensureRegistered();
  const client = await getStealthClient();
  const doDeposit = getATAIntoETADirectDepositorFunction({ client });
  return doDeposit(client.signer.address, mint, amount as any);
}
