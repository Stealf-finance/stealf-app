import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { clearStealthState } from '@/src/features/stealth/hooks/useUmbra';
import { umbraClearSeed } from '@/src/services/umbra/seed';
import { useAuth } from '../context/AuthContext';
import { purgeTurnkeyState } from '../lib/passkeyHelpers';

export function useLogout() {
  const { logout: turnkeyLogout } = useTurnkey();
  const { reset } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
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
