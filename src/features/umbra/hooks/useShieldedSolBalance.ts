import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchEncryptedBalances } from '@/src/services/umbra/queries/balances';
import { SOL_MINT } from '@/src/constants/solana';
import { LAMPORTS_PER_SOL } from '@/src/services/solana/kit';

export interface ShieldedSolBalance {
  lamports: bigint;
  sol: number;
  state: string | null;
}

const MAX_PLAUSIBLE_LAMPORTS = 1_000_000_000n * BigInt(LAMPORTS_PER_SOL);

export const shieldedBalanceQueries = {
  byStealfWallet: (wallet: string) =>
    ['stealth', 'shielded-sol-balance', wallet] as const,
};

export function useShieldedSolBalance() {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';

  return useQuery<ShieldedSolBalance>({
    queryKey: shieldedBalanceQueries.byStealfWallet(wallet),
    queryFn: async () => {
      const balances = await fetchEncryptedBalances([SOL_MINT as Address]);
      const entry = balances.get(SOL_MINT as Address);

      if (entry?.state === 'shared' && typeof entry.balance === 'bigint') {
        const lamports = entry.balance as bigint;
        if (lamports < 0n || lamports > MAX_PLAUSIBLE_LAMPORTS) {
          return { lamports: 0n, sol: 0, state: 'corrupted' };
        }
        return {
          lamports,
          sol: Number(lamports) / LAMPORTS_PER_SOL,
          state: entry.state,
        };
      }

      return { lamports: 0n, sol: 0, state: entry?.state ?? null };
    },
    enabled: !!wallet,
    staleTime: 30_000,
    refetchOnReconnect: true,
  });
}
