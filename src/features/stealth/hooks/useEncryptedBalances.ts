import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchEncryptedBalances } from '@/src/services/umbra/queries/balances';

export const encryptedBalancesQueries = {
  byStealfWallet: (wallet: string, mints: readonly string[]) =>
    ['stealth', 'encrypted-balances', wallet, ...mints] as const,
};

/**
 * Fetch encrypted balances for the given mints. Requires a stealth wallet
 * with a master seed already loaded — gated on `user.stealfWallet`.
 */
export function useEncryptedBalances(mints: Address[]) {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';
  const mintStrings = mints.map((m) => m.toString());

  return useQuery({
    queryKey: encryptedBalancesQueries.byStealfWallet(wallet, mintStrings),
    queryFn: () => fetchEncryptedBalances(mints),
    enabled: !!wallet && mints.length > 0,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
