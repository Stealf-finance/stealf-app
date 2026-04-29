import { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } from '@umbra-privacy/sdk';
import type { Address } from '@solana/kit';
import { getStealthClient } from '../client';

/** Stealth encrypted balance → stealth public ATA. */
export async function withdraw(mint: Address, amount: bigint) {
  const client = await getStealthClient();
  const doWithdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });
  return doWithdraw(client.signer.address, mint, amount as any);
}
