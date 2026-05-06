import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { useAuth } from '../context/AuthContext';
import { purgeTurnkeyState } from '../lib/passkeyHelpers';

/**
 * Permanently deletes the user's Turnkey sub-organization, then runs the
 * same local cleanup as `useLogout` so AuthGuard can route them back to
 * the welcome screen. If Turnkey rejects the delete (no session, network),
 * we still wipe local state — the user can't recover from a half-deleted
 * trip otherwise.
 */
export function useDeleteAccount() {
  const { deleteSubOrganization, logout: turnkeyLogout } = useTurnkey();
  const { reset } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await deleteSubOrganization({ deleteWithoutExport: true } as any);
      } catch (err) {
        if (__DEV__) {
          console.warn('[deleteAccount] Turnkey delete failed:', err);
        }
      }

      socketService.disconnect();
      clearStealthState();
      await umbraClearSeed();
      await walletKeyCache.clearAll();
      try {
        await turnkeyLogout();
      } catch {
      }
      await purgeTurnkeyState();
      queryClient.clear();
      reset();
    },
  });
}
