import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useEncryptedBalances } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { aggregateHomeBalances, type HomeBalances } from '../lib/aggregateHomeBalances';

export function useHomeBalances(): HomeBalances & { isLoading: boolean } {
  const { user } = useAuth();
  const bank = useBalance(user?.bankWallet ?? null);
  const stealf = useBalance(user?.stealfWallet ?? null);
  const encrypted = useEncryptedBalances();

  const totals = aggregateHomeBalances({
    bank: bank.data,
    stealf: stealf.data,
    encrypted: encrypted.data,
  });

  return {
    ...totals,
    isLoading: bank.isLoading || stealf.isLoading || encrypted.isLoading,
  };
}
