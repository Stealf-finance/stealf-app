import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchUsdcYieldBalance,
  fetchUsdcYieldPositions,
  fetchUsdcYieldStats,
  usdcYieldQueries,
  type UsdcYieldBalance,
  type UsdcYieldPositions,
  type UsdcYieldStats,
  type UsdcYieldWalletContext,
} from '../api/usdcYield';

/** Reflect USDC+ protocol stats (rate, APY, TVL). Public — no auth needed. */
export function useUsdcYieldStats() {
  return useQuery<UsdcYieldStats | null>({
    queryKey: usdcYieldQueries.stats(),
    queryFn: fetchUsdcYieldStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/** USDC+ balance held by `wallet` (the user's bank wallet for the bank flow). */
export function useUsdcYieldBalance(wallet: string | null | undefined) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<UsdcYieldBalance | null>({
    queryKey: usdcYieldQueries.balance(wallet ?? ''),
    queryFn: () => {
      if (!token || !wallet) {
        throw new Error('useUsdcYieldBalance called without auth or wallet');
      }
      return fetchUsdcYieldBalance(token, wallet);
    },
    enabled: Boolean(token && wallet),
    staleTime: 30_000,
  });
}

/** Recorded mint/burn positions, optionally filtered by signer context. */
export function useUsdcYieldPositions(walletContext?: UsdcYieldWalletContext) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<UsdcYieldPositions>({
    queryKey: usdcYieldQueries.positions(walletContext ?? 'all'),
    queryFn: () => {
      if (!token) {
        throw new Error('useUsdcYieldPositions called without auth');
      }
      return fetchUsdcYieldPositions(token, walletContext);
    },
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}

/** Invalidate cached balance + positions after a mint/burn settles. */
export function useInvalidateUsdcYield() {
  const queryClient = useQueryClient();
  return (wallet?: string) => {
    queryClient.invalidateQueries({
      queryKey: wallet
        ? usdcYieldQueries.balance(wallet)
        : ['usdc-yield-balance'],
    });
    queryClient.invalidateQueries({ queryKey: ['usdc-yield-positions'] });
  };
}
