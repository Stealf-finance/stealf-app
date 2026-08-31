import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { persister } from '@/src/services/queryClient';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/umbra/hooks/useUmbra';
import { clearMasterSeed } from '@/src/services/umbra/storage/masterSeed';
import { clearAllMmkvStorageBackend } from '@/src/services/umbra/storage/mmkvStorageBackend';
import { useAuth } from '../context/AuthContext';
import { purgeTurnkeyState } from '../lib/passkeyHelpers';
import { deleteAccountOnBackend } from '../api/onboarding';

export function useDeleteAccount() {
  const { deleteSubOrganization, logout: turnkeyLogout } = useTurnkey();
  const { session, reset, user } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async () => {
      posthog?.capture('auth_account_deleted');

      const sessionToken = session?.sessionToken;
      if (sessionToken) {
        try {
          await deleteAccountOnBackend(sessionToken);
        } catch (err) {
          if (__DEV__) {
            console.warn('[deleteAccount] backend delete failed:', err);
          }
          Sentry.captureException(err, {
            tags: { 'auth.flow': 'delete-account-backend' },
          });
        }
      }

      try {
        await deleteSubOrganization({ deleteWithoutExport: true } as any);
      } catch (err) {
        if (__DEV__) {
          console.warn('[deleteAccount] Turnkey delete failed:', err);
        }
        Sentry.captureException(err, {
          tags: { 'auth.flow': 'delete-account-turnkey' },
        });
      }

      socketService.disconnect();
      clearStealthState();
      if (user?.stealfWallet) await clearMasterSeed(user.stealfWallet);
      if (user?.bankWallet) await clearMasterSeed(user.bankWallet);
      // Deleting the account must not leave the decrypted UTXO / nullifier
      // store behind on the device.
      await clearAllMmkvStorageBackend();
      await walletKeyCache.clearAll();
      try {
        await turnkeyLogout();
      } catch {}
      await purgeTurnkeyState();
      queryClient.clear();
      // In-memory clear() leaves the persisted snapshot (balance/history/profile)
      // in AsyncStorage; remove it so a deleted account can't rehydrate on next launch.
      await persister.removeClient();
      reset();
      posthog?.reset();
    },
  });
}
