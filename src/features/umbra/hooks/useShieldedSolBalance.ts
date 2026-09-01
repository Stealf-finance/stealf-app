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
// Module scope: React Compiler cannot lower a BigInt literal inside a hook.
const ZERO_LAMPORTS = 0n;

export const shieldedBalanceQueries = {
  byWallet: (wallet: string) =>
    ['stealth', 'shielded-sol-balance', wallet] as const,
};

export function useShieldedSolBalance() {
  const { user } = useAuth();
  const wallet = user?.bankWallet ?? '';

  return useQuery<ShieldedSolBalance>({
    queryKey: shieldedBalanceQueries.byWallet(wallet),
    queryFn: async () => {
      const balances = await fetchEncryptedBalances([SOL_MINT as Address]);
      const entry = balances.get(SOL_MINT as Address);

      if (entry?.state === 'shared' && typeof entry.balance === 'bigint') {
        const lamports = entry.balance as bigint;
        if (lamports < ZERO_LAMPORTS || lamports > MAX_PLAUSIBLE_LAMPORTS) {
          return { lamports: ZERO_LAMPORTS, sol: 0, state: 'corrupted' };
        }
        return {
          lamports,
          sol: Number(lamports) / LAMPORTS_PER_SOL,
          state: entry.state,
        };
      }

      return { lamports: ZERO_LAMPORTS, sol: 0, state: entry?.state ?? null };
    },
    enabled: !!wallet,
    staleTime: 30_000,
    refetchOnReconnect: true,
  });
}
