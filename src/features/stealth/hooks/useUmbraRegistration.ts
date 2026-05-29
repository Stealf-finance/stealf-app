import { useQuery } from '@tanstack/react-query';
import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk/query';
import { toAddress } from '@/src/services/solana/kit';
import { getStealthClient } from '@/src/services/umbra/client';

export const umbraRegistrationQueries = {
  byAddress: (addr: string) => ['umbra', 'registration', addr] as const,
};


export async function fetchUmbraRegistration(
  walletAddress: string,
): Promise<boolean> {
  const client = await getStealthClient();
  const querier = getUserAccountQuerierFunction({ client });
  const result = await querier(toAddress(walletAddress));
  return result.state === 'exists';
}

export function useUmbraRegistration(walletAddress: string | null | undefined) {
  return useQuery({
    queryKey: umbraRegistrationQueries.byAddress(walletAddress ?? ''),
    queryFn: () => {
      if (!walletAddress) return false;
      return fetchUmbraRegistration(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
