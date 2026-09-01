import { useQuery } from '@tanstack/react-query';
import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk/query';
import { toAddress } from '@/src/services/solana/kit';
import { getActiveClient } from '@/src/services/umbra/client';
import { useHasActiveSigner } from './useHasActiveSigner';

export const umbraRegistrationQueries = {
  byAddress: (addr: string) => ['umbra', 'registration', addr] as const,
};

export async function fetchUmbraRegistration(
  walletAddress: string,
): Promise<boolean> {
  const client = await getActiveClient();
  const querier = getUserAccountQuerierFunction({ client });
  const result = await querier(toAddress(walletAddress));
  return result.state === 'exists';
}

export function useUmbraRegistration(walletAddress: string | null | undefined) {
  const signerReady = useHasActiveSigner();

  return useQuery({
    queryKey: umbraRegistrationQueries.byAddress(walletAddress ?? ''),
    queryFn: () => {
      if (!walletAddress) return false;
      return fetchUmbraRegistration(walletAddress);
    },
    // Same signer dependency as the encrypted balance: `fetchUmbraRegistration`
    // goes through `getActiveClient()`. Firing early left this query in error
    // with `data` undefined, which UmbraSetupOverlay reads as "registration
    // still unknown" — its "Checking your private setup…" loader then never
    // cleared.
    enabled: signerReady && !!walletAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
