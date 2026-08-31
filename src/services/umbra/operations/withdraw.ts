import { getETAIntoATAWithdrawerFunction } from '@umbra-privacy/sdk/withdrawal';
import type { Address } from '@solana/kit';
import { getActiveClient } from '../client';

export async function withdraw(mint: Address, amount: bigint) {
  const client = await getActiveClient();
  const doWithdraw = getETAIntoATAWithdrawerFunction({ client });
  return doWithdraw(client.signer.address, mint, amount as any);
}
