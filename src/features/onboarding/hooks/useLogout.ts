import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { useAuth } from '../context/AuthContext';
import { clearOnboardingDraft } from '../lib/onboardingDraft';
import { purgeTurnkeyState } from '../lib/passkeyHelpers';

export function useLogout() {
  const { logout: turnkeyLogout } = useTurnkey();
  const { reset } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      socketService.disconnect();
      await walletKeyCache.clearAll();
      await clearOnboardingDraft();
      try {
        await turnkeyLogout();
      } catch {
        // Turnkey may throw if no session — keep going to ensure local cleanup
      }
      await purgeTurnkeyState();
      queryClient.clear();
      reset();
    },
  });
}
