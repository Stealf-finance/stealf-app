import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { clearAsyncStorageBackend } from '@/src/services/umbra/storage/asyncStorageBackend';
import { clearMmkvStorageBackend } from '@/src/services/umbra/storage/mmkvStorageBackend';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export function useDeleteStealthWallet() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const prevStealfWallet = user?.stealfWallet ?? null;

      clearStealthState();
      await umbraClearSeed();
      await walletKeyCache.clearAll();
      if (prevStealfWallet) {
        // Wipe the wallet's Umbra store — MMKV (current backend) plus the
        // legacy AsyncStorage namespace, so no decrypted UTXO data lingers.
        clearMmkvStorageBackend(prevStealfWallet);
        await clearAsyncStorageBackend(prevStealfWallet).catch(() => undefined);
      }

      if (user) {
        setUser({
          ...user,
          stealfWallet: null,
          stealthRegistered: undefined,
        });
      }

      queryClient.removeQueries({ queryKey: ['stealth'] });
      if (prevStealfWallet) {
        queryClient.removeQueries({
          queryKey: balanceQueries.byAddress(prevStealfWallet),
        });
        queryClient.removeQueries({
          queryKey: historyQueries.byAddress(prevStealfWallet),
        });
      }
    },
  });
}
