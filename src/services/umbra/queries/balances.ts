import { getEncryptedBalanceQuerierFunction } from '@umbra-privacy/sdk/query';
import type { Address } from '@solana/kit';
import { getActiveClient } from '../client';

export async function fetchEncryptedBalances(
  mints: Address[],
): Promise<Map<Address, any>> {
  const client = await getActiveClient();
  const fetchBalances = getEncryptedBalanceQuerierFunction({ client });
  return fetchBalances(mints);
}
