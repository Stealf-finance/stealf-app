/**
 * JitoSOL holdings for the stealth wallet.
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
  const wallet = user?.stealfWallet ?? null;

  return useQuery<JitoSolBalance>({
    queryKey: jitoSolBalanceQueries.byWallet(wallet ?? ''),
    queryFn: () => getJitoSolBalance(wallet!),
    enabled: Boolean(wallet),
    staleTime: 30_000,
  });
}

/** Derived JitoSOL position: amount held + its USD value (jitoSOL · rate · SOL price). */
export function useJitoSolPosition() {
  const { data: balance } = useJitoSolBalance();
  const { data: pool } = usePoolInfo();
  const { data: solPrice } = useSolPrice();

  const jitoSol = balance?.uiAmount ?? 0;
  const rate = pool?.solJitoConversion ?? 0;
  const price = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;

  return { jitoSol, usdValue: jitoSol * rate * price, raw: balance?.raw ?? 0n };
}
