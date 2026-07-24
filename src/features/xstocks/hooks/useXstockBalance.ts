import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchXstockBalance, type XstockBalance } from '../api/balance';
import { xstockQueries } from '../api/assets';

/**
 * xStock holding for the given symbol. xStocks are traded from — and held on —
 * the stealth wallet, so the balance is read against `user.stealfWallet`.
 */
export function useXstockBalance(symbol: string | null) {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? null;

  return useQuery<XstockBalance>({
    queryKey: xstockQueries.balance(wallet ?? '', symbol ?? ''),
    queryFn: () => fetchXstockBalance(wallet!, symbol!),
    enabled: Boolean(wallet && symbol),
    staleTime: 30_000,
  });
}
