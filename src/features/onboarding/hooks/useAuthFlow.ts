import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { OtpType } from '@turnkey/core';
import * as Sentry from '@sentry/react-native';
import { usePostHog } from 'posthog-react-native';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { useAuth, readPersistedStealfWallet } from '../context/AuthContext';
import {
  finalizeOAuthAuth,
  type AuthMethod,
  type OauthProvider,
} from '../api/onboarding';
import { userProfileQueries } from '../api/userProfile';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';
import { subscribeOauthAuthSuccess } from '@/src/services/turnkey/oauthAuthEvents';
import { maybeRequestNotifPermission } from '@/src/features/onboarding/lib/permissions';

type FinalizeArgs = {
  authMethod: AuthMethod;
  sessionToken: string;
  email: string | undefined;
  oauthSub: string | undefined;
  oauthProvider: OauthProvider | undefined;
  oidcToken: string | undefined;
};

export function useAuthFlow() {
  const turnkey = useTurnkey();
  const turnkeyRef = useRef(turnkey);
  turnkeyRef.current = turnkey;

  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const posthogRef = useRef(posthog);
  posthogRef.current = posthog;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingOauth, setPendingOauth] = useState<OauthProvider | null>(null);

  const finalizingRef = useRef(false);

  const isClientReady = turnkey.clientState === ClientState.Ready;

  const finalizePostAuth = useCallback(
    async ({
      authMethod,
      sessionToken,
      email,
      oauthSub,
      oauthProvider,
      oidcToken,
    }: FinalizeArgs) => {
      const tk = turnkeyRef.current;

      const wallets = tk.wallets.length
        ? tk.wallets
        : await tk.refreshWallets();
      const cashWallet = wallets[0]?.accounts?.[0]?.address;
      if (!cashWallet) {
            if (__DEV__) {
            console.log('[Auth] BANK WALLET MISSING DIAG:', {
              subOrgId: tk.session?.organizationId,
              walletsBefore: tk.wallets.length,
              walletsAfterRefresh: wallets.length,
        walletsDump: JSON.stringify(wallets, null, 2),
      });
    }
        throw new Error('Bank wallet not provisioned');
      }

      const subOrgId = tk.session?.organizationId;
      if (!subOrgId) {
        // Should be unreachable — the SDK only emits `onAuthenticationSuccess`
        // once the session is materialised — but the backend lookup hinges on
        // this value, so fail loudly here rather than 400-ing with a
        // misleading "email missing" from the server.
        throw new Error('Turnkey sub-org id missing after auth');
      }

      const profile = await finalizeOAuthAuth({
        sessionToken,
        subOrgId,
        email,
        pseudo: email ? pseudoFromEmail(email) : undefined,
        cashWallet,
        authMethod,
        oauthSub,
        oauthProvider,
        oidcToken,
      });

      const persistedStealf = await readPersistedStealfWallet();
      const enriched = persistedStealf
        ? { ...profile, stealfWallet: persistedStealf }
        : profile;

      queryClient.removeQueries({
        queryKey: balanceQueries.byAddress(cashWallet),
      });
      queryClient.removeQueries({
        queryKey: historyQueries.byAddress(cashWallet),
      });

      void Promise.all([
        queryClient.prefetchQuery({
          queryKey: balanceQueries.byAddress(cashWallet),
          queryFn: () => fetchBalance(sessionToken, cashWallet),
          staleTime: Infinity,
        }),
        queryClient.prefetchQuery({
          queryKey: historyQueries.byAddress(cashWallet),
          queryFn: () => fetchHistory(sessionToken, cashWallet, 10),
          staleTime: Infinity,
        }),
      ]);

      queryClient.setQueryData(
        userProfileQueries.byBankWallet(cashWallet),
        enriched,
      );
      await walletKeyCache.warmup();

      setSession({ sessionToken });
      setUser(enriched);

      // First-time-on-device notification permission prompt. The helper
      // gates on `status === 'undetermined'`, so it only surfaces the iOS
      // system dialog at account creation (or first install of a returning
      // user). Non-blocking — failures don't propagate.
      void maybeRequestNotifPermission();

      posthogRef.current?.identify(enriched.subOrgId, {
        $set: { auth_method: authMethod },
        $set_once: { first_login_date: new Date().toISOString() },
      });
      posthogRef.current?.capture('auth_signed_in', {
        method: authMethod,
      });
    },
    [queryClient, setSession, setUser],
  );

  useEffect(() => {
    if (!pendingOauth) return;

    const method = pendingOauth;
    const unsubscribe = subscribeOauthAuthSuccess(
      ({ email, oauthSub, sessionToken, identifier }) => {
        if (finalizingRef.current) return;
        finalizingRef.current = true;
        setIsLoading(true);

        Sentry.addBreadcrumb({
          category: 'auth.oauth',
          level: 'info',
          message: 'useAuthFlow subscriber received OAuth event',
          data: { method, hasEmail: !!email, hasSub: !!oauthSub },
        });
        if (__DEV__) {
          console.log('[useAuthFlow] starting finalize', {
            method,
            hasEmail: !!email,
            hasSub: !!oauthSub,
            hasSessionToken: !!sessionToken,
          });
        }

        finalizePostAuth({
          authMethod: method,
          sessionToken,
          email,
          oauthSub,
          oauthProvider: method,
          oidcToken: identifier,
        })
        .catch((err) => {
          if (__DEV__) {
            const data = (err as { data?: unknown })?.data;
            const bodyKeys =
              typeof data === 'object' && data !== null
                ? Object.keys(data)
                : '(non-object)';
            console.error('[useAuthFlow] finalize failed:', err, 'bodyKeys:', bodyKeys);
          }
          // Always capture: in prod __DEV__ logs are silent, and the email
          // OTP / Apple OAuth divergence we're chasing happens server-side
          // (400 "Email and pseudo required") — capturing here surfaces the
          // breadcrumb chain (`auth.oauth` markers) needed to localise it.
          Sentry.captureException(err, {
            tags: { 'auth.method': method, 'auth.flow': 'finalize-post-auth' },
            extra: {
              hasEmail: !!email,
              hasSessionToken: !!sessionToken,
              errorStatus: (err as { status?: number })?.status,
            },
          });
          setError(softenMissingEmailError(method, email, err));
        })
        .finally(() => {
          finalizingRef.current = false;
          setIsLoading(false);
          setPendingOauth(null);
        });
      },
    );
    return unsubscribe;
  }, [pendingOauth, finalizePostAuth]);

  const runOAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      const tk = turnkeyRef.current;
      const handler =
        provider === 'google' ? tk.handleGoogleOauth : tk.handleAppleOauth;
      setError(null);
      setPendingOauth(provider);
      try {

        await handler({});
      } catch (err) {
        setPendingOauth(null);
        if (isCancellationError(err)) return;
        setError(toMessage(err));
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(() => runOAuth('google'), [runOAuth]);
  const signInWithApple = useCallback(() => runOAuth('apple'), [runOAuth]);

  const sendEmailCode = useCallback(
    async (email: string): Promise<{ otpId: string }> => {
      setIsLoading(true);
      setError(null);
      try {
        const otpId = await turnkeyRef.current.initOtp({
          otpType: OtpType.Email,
          contact: email,
        });
        if (!otpId) {
          throw new Error('Failed to send code');
        }
        return { otpId };
      } catch (err) {
        setError(toMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const verifyEmailCode = useCallback(
    async (otpId: string, otpCode: string, email: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await turnkeyRef.current.completeOtp({
          otpId,
          otpCode,
          contact: email,
          otpType: OtpType.Email,
        });
        const sessionToken = result?.sessionToken;
        if (!sessionToken) {
          throw new Error('OTP verification did not return a session');
        }
        await finalizePostAuth({
          authMethod: 'email',
          sessionToken,
          email,
          oauthSub: undefined,
          oauthProvider: undefined,
          oidcToken: undefined,
        });
      } catch (err) {
        setError(toMessage(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [finalizePostAuth],
  );

  return {
    signInWithGoogle,
    signInWithApple,
    sendEmailCode,
    verifyEmailCode,
    resendEmailCode: sendEmailCode,
    isLoading,
    isAuthenticating: isLoading || pendingOauth !== null,
    pendingProvider: pendingOauth,
    error,
    isClientReady,
  };
}

function pseudoFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const sanitized = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 14);
  const suffix = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, '0');
  const base = sanitized.length >= 1 ? sanitized : 'user';
  return `${base}_${suffix}`;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Authentication failed';
}


function softenMissingEmailError(
  method: AuthMethod,
  email: string | undefined,
  err: unknown,
): string {
  const raw = toMessage(err);
  if (
    method === 'apple' &&
    !email &&
    /email and pseudo are required/i.test(raw)
  ) {
    Sentry.captureMessage(
      'OAuth Apple new-user signup missing email (private relay?)',
      { level: 'warning' },
    );
    return "We couldn't get your email from Apple. Try signing in with Email or Google instead.";
  }
  return raw;
}

function isCancellationError(err: unknown): boolean {
  const rawMsg = String((err as Error | undefined)?.message ?? '');
  const msg = rawMsg.toLowerCase();
  const matches =
    msg.includes('did not complete successfully') ||
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('interrupt') ||
    msg.includes('user closed');
  if (matches) {

    Sentry.addBreadcrumb({
      category: 'auth.cancel',
      level: 'info',
      message: 'OAuth flow swallowed as cancellation',
      data: { rawMessage: rawMsg.slice(0, 200) },
    });
  }
  return matches;
}
