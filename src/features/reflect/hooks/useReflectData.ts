/**
 * STLF (Reflect) read hooks: protocol stats (public) + the bank wallet's STLF
 * balance (authenticated). Consumed by the STLF card + product screen.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchReflectBalance,
  fetchReflectStats,
  reflectQueries,
  type ReflectBalance,
  type ReflectStats,
} from '../api/reflect';

/** Reflect/STLF stats (rate, holder APY, TVL). Public — no auth needed. */
export function useReflectStats() {
  return useQuery<ReflectStats | null>({
    queryKey: reflectQueries.stats(),
    queryFn: fetchReflectStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/** STLF balance held by `wallet` (the user's bank wallet for the bank flow). */
export function useReflectBalance(wallet: string | null | undefined) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<ReflectBalance | null>({
    queryKey: reflectQueries.balance(wallet ?? ''),
    queryFn: () => {
      if (!token || !wallet) {
        throw new Error('useReflectBalance called without auth or wallet');
      }
      return fetchReflectBalance(token, wallet);
    },
    enabled: Boolean(token && wallet),
    staleTime: 30_000,
  });
}

/** Invalidate cached STLF balance after a mint/burn settles. */
export function useInvalidateReflect() {
  const queryClient = useQueryClient();
  return (wallet?: string) => {
    queryClient.invalidateQueries({
      queryKey: wallet ? reflectQueries.balance(wallet) : ['reflect-balance'],
    });
  };
}
