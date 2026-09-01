/**
 * JitoSOL holdings for the wallet.
 *
 * `useJitoSolBalance` is the raw React Query read (ATA balance). `useJitoSolPosition`
 * composes it with the pool exchange rate + SOL price to derive a USD value —
 * used by the Earn card and the product screen's Balance hero, and by the
 * withdraw flow's source balance / gating.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import { getJitoSolBalance, type JitoSolBalance } from '@/src/services/jitoSOL/balance';
import { usePoolInfo } from './usePoolInfo';

export const jitoSolBalanceQueries = {
  byWallet: (wallet: string) => ['jito-sol-balance', wallet] as const,
};

export function useJitoSolBalance() {
  const { user } = useAuth();
  const wallet = user?.bankWallet ?? null;

  return useQuery<JitoSolBalance>({
    queryKey: jitoSolBalanceQueries.byWallet(wallet ?? ''),
    queryFn: () => getJitoSolBalance(wallet!),
    enabled: Boolean(wallet),
    staleTime: 30_000,
  });
}

/**
 * Derived JitoSOL position: amount held + its USD value (jitoSOL · rate · SOL
 * price).
 *
 * The three inputs are separate queries, and each was previously defaulted to
 * 0 — which multiplied out to a confident `$0` whenever any one of them was
 * missing, indistinguishable from an empty position. They now stay
 * `undefined` until known, so callers can tell the two apart.
 */
export function useJitoSolPosition() {
  const balanceQuery = useJitoSolBalance();
  const poolQuery = usePoolInfo();
  const priceQuery = useSolPrice();

  const jitoSol = balanceQuery.data?.uiAmount;
  const rate = poolQuery.data?.solJitoConversion;
  const solPrice = priceQuery.data;
  const price = typeof solPrice === 'number' && solPrice > 0 ? solPrice : undefined;

  const usdValue =
    jitoSol === undefined || rate === undefined || price === undefined
      ? undefined
      : jitoSol * rate * price;

  return {
    jitoSol,
    usdValue,
    raw: balanceQuery.data?.raw ?? 0n,
    /**
     * `usePoolInfo` reads a mainnet-only stake pool account, so against a
     * devnet RPC it fails on every call. Surfacing that is the point: the old
     * `?? 0` turned a hard failure into a plausible-looking `$0`.
     */
    error: balanceQuery.isError || poolQuery.isError || priceQuery.isError,
  };
}
