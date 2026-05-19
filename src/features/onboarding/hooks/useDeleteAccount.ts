import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { useAuth } from '../context/AuthContext';
import { purgeTurnkeyState } from '../lib/passkeyHelpers';
import { deleteAccountOnBackend } from '../api/onboarding';

/**
 * Permanently deletes the user's account end-to-end:
 *
 *   1. Backend record (Mongo) — must happen FIRST while the Turnkey
 *      JWT is still valid. Without this, the user's emailHash stays in
 *      the DB and the next sign-up with the same email would re-link
 *      onto the old (orphaned) record (cf authController re-link path).
 *   2. Turnkey sub-organization — `deleteWithoutExport: true` throws
 *      away the keypair material; the on-chain bank wallet is forever
 *      unrecoverable beyond this call.
 *   3. Local cleanup — mirrors `useLogout` so AuthGuard sees a clean
 *      slate and routes back to welcome.
 *
 * Every step is try/catch'd: if any single one fails we still proceed
 * with the rest, because leaving the user in a half-deleted state is
 * worse than leaving a stray record behind that we can clean up later.
 * Failures are captured to Sentry so we don't lose the trail silently.
 */
export function useDeleteAccount() {
  const { deleteSubOrganization, logout: turnkeyLogout } = useTurnkey();
  const { session, reset } = useAuth();
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
      await umbraClearSeed();
      await walletKeyCache.clearAll();
      try {
        await turnkeyLogout();
      } catch {
      }
      await purgeTurnkeyState();
      queryClient.clear();
      reset();
      posthog?.reset();
    },
  });
}
