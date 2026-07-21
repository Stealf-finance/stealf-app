import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { clearAllMmkvStorageBackend } from '@/src/services/umbra/storage/mmkvStorageBackend';
import { useAuth } from '../context/AuthContext';
import { performSessionTeardown } from '../lib/sessionTeardown';

export function useLogout() {
  const { logout: turnkeyLogout } = useTurnkey();
  const { reset } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async () => {
      posthog?.capture('auth_signed_out');
      socketService.disconnect();
      clearStealthState();
      await umbraClearSeed();
      // Drops the decrypted UTXO / nullifier store. Without it the previous
      // user's private transaction graph survives logout on a shared device.
      await clearAllMmkvStorageBackend();
      await walletKeyCache.clearAll();
      try {
        await turnkeyLogout();
      } catch {}
      await purgeTurnkeyState();
      queryClient.clear();
      reset();
      posthog?.reset();
    },
  });
}
