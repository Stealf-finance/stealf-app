import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { performSessionTeardown } from '@/src/features/onboarding/lib/sessionTeardown';
import { subscribeSessionExpired } from '@/src/services/auth/sessionEvents';

export function SessionSync() {
  const { session: turnkeySession, logout: turnkeyLogout } = useTurnkey();
  const { session, setSession, reset, user } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const turnkeyToken = turnkeySession?.token;
  const currentToken = session?.sessionToken;

  useEffect(() => {
    if (!currentToken || !turnkeyToken) return;
    if (currentToken === turnkeyToken) return;
    if (__DEV__) console.log('[SessionSync] Turnkey rotated the session token');
    setSession({ sessionToken: turnkeyToken });
  }, [currentToken, turnkeyToken, setSession]);

  const teardownDeps = useRef({
    turnkeyLogout,
    reset,
    queryClient,
    posthog,
    user,
  });
  useEffect(() => {
    teardownDeps.current = { turnkeyLogout, reset, queryClient, posthog, user };
  });

  useEffect(
    () =>
      subscribeSessionExpired((reason) => {
        const {
          turnkeyLogout: tkLogout,
          reset: rst,
          queryClient: qc,
          posthog: ph,
          user: usr,
        } = teardownDeps.current;
        if (__DEV__) console.log('[SessionSync] session expired:', reason);
        void performSessionTeardown('session_expired', {
          turnkeyLogout: tkLogout,
          reset: rst,
          queryClient: qc,
          capture: (event) => ph?.capture(event),
          resetAnalytics: () => ph?.reset(),
          bankWallet: usr?.bankWallet,
        });
      }),
    [],
  );

  return null;
}
