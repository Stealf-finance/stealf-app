import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { performSessionTeardown } from '@/src/features/onboarding/lib/sessionTeardown';
import { subscribeSessionExpired } from '@/src/services/auth/sessionEvents';

/**
 * Keeps app session state in step with Turnkey's.
 *
 * Turnkey's `autoRefreshSession` does not extend the existing JWT — it mints a
 * brand new one ~60s before expiry and swaps it into provider state. There is
 * no `onSessionRefreshed` callback; the only observation channel is the
 * reactive `session` object. Without this component the app keeps sending the
 * token it captured at login, and every request 401s with "JWT expired" once
 * the first rotation lands (default session length is 15 minutes).
 *
 * Mounts inside <AuthProvider>, which is inside <TurnkeyProvider>.
 */
export function SessionSync() {
  const { session: turnkeySession, logout: turnkeyLogout } = useTurnkey();
  const { session, setSession, reset } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const turnkeyToken = turnkeySession?.token;
  const currentToken = session?.sessionToken;

  // Mirror rotations only. Session *creation* belongs to useAuthFlow and
  // *destruction* to the teardown; if this also created sessions it would race
  // logout — Turnkey's session object can outlive our reset() by a tick and
  // would write the token straight back into SecureStore.
  useEffect(() => {
    if (!currentToken || !turnkeyToken) return;
    if (currentToken === turnkeyToken) return;
    if (__DEV__) console.log('[SessionSync] Turnkey rotated the session token');
    setSession({ sessionToken: turnkeyToken });
  }, [currentToken, turnkeyToken, setSession]);

  // Deps change identity across renders; hold them in a ref so the
  // subscription itself stays mounted for the life of the component.
  const teardownDeps = useRef({ turnkeyLogout, reset, queryClient, posthog });
  teardownDeps.current = { turnkeyLogout, reset, queryClient, posthog };

  useEffect(
    () =>
      subscribeSessionExpired((reason) => {
        const { turnkeyLogout: tkLogout, reset: rst, queryClient: qc, posthog: ph } =
          teardownDeps.current;
        if (__DEV__) console.log('[SessionSync] session expired:', reason);
        void performSessionTeardown('session_expired', {
          turnkeyLogout: tkLogout,
          reset: rst,
          queryClient: qc,
          capture: (event) => ph?.capture(event),
          resetAnalytics: () => ph?.reset(),
        });
      }),
    [],
  );

  return null;
}
