import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '../context/AuthContext';
import { performSessionTeardown } from '../lib/sessionTeardown';

export function useLogout() {
  const { logout: turnkeyLogout } = useTurnkey();
  const { reset } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return useMutation({
    mutationFn: () =>
      performSessionTeardown('user_signed_out', {
        turnkeyLogout,
        reset,
        queryClient,
        capture: (event) => posthog?.capture(event),
        resetAnalytics: () => posthog?.reset(),
      }),
  });
}
