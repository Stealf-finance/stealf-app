import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { clearAsyncStorageBackend } from '@/src/services/umbra/storage/asyncStorageBackend';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

/**
 * Wipe the stealth wallet locally: SecureStore keys (private key, mnemonic,
 * address), in-memory caches, Umbra-derived seed, claim-scan AsyncStorage,
 * and the React Query caches that key off the stealf wallet. Leaves the
 * Turnkey-managed bank wallet and the user account alone — this is a
 * stealth-only reset, not a logout.
 *
 * Destructive: anyone without their saved recovery phrase loses access to
 * their encrypted balance permanently. The UI must gate this behind an
 * explicit confirmation.
 */
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

      // Drop every cache entry keyed off the now-gone stealf wallet so the
      // next setup sees a clean slate. Prefix invalidation catches the
      // multi-mint encrypted-balance variants too.
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
