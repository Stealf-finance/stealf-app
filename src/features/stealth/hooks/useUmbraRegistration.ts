import { useQuery } from '@tanstack/react-query';
import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk';
import { toAddress } from '@/src/services/solana/kit';
import { getStealthClient } from '@/src/services/umbra/client';

export const umbraRegistrationQueries = {
  byAddress: (addr: string) => ['umbra', 'registration', addr] as const,
};

/**
 * Reads the on-chain `EncryptedUserAccount` PDA for any wallet address to
 * decide whether that wallet is registered with the Umbra protocol. The
 * query is read-only and runs through the stealth RPC client (any client
 * works for the lookup — only the queried `address` matters).
 */
export function useUmbraRegistration(walletAddress: string | null | undefined) {
  return useQuery({
    queryKey: umbraRegistrationQueries.byAddress(walletAddress ?? ''),
    queryFn: async () => {
      if (!walletAddress) return false;
      const client = await getStealthClient();
      const querier = getUserAccountQuerierFunction({ client });
      const result = await querier(toAddress(walletAddress));
      return result.state === 'exists';
    },
    enabled: !!walletAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
