import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { clearAsyncStorageBackend } from '@/src/services/umbra/storage/asyncStorageBackend';
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
          queryKey: ['wallet-balance', prevStealfWallet],
        });
        queryClient.removeQueries({
          queryKey: ['wallet-history', prevStealfWallet],
        });
      }
    },
  });
}
