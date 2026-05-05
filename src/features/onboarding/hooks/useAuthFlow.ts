import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { OtpType } from '@turnkey/core';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { useAuth, readPersistedStealfWallet } from '../context/AuthContext';
import { finalizeOAuthAuth, type AuthMethod } from '../api/onboarding';
import { userProfileQueries } from '../api/userProfile';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';


export function useAuthFlow() {
  const turnkey = useTurnkey();
  const turnkeyRef = useRef(turnkey);
  turnkeyRef.current = turnkey;

  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClientReady = turnkey.clientState === ClientState.Ready;

  const finalizePostAuth = useCallback(
    async (authMethod: AuthMethod, emailOverride?: string) => {
      const tk = turnkeyRef.current;

      const sessionToken = tk.session?.token;
      if (!sessionToken) {
        throw new Error('Turnkey session missing after authentication');
      }

      const email = emailOverride ?? tk.user?.userEmail;
      if (!email) {
        throw new Error('No email returned by the auth provider');
      }

      // OAuth providers create the wallet during auth; if it isn't already
      // mirrored in the context, refresh once before reading.
      const wallets = tk.wallets.length
        ? tk.wallets
        : await tk.refreshWallets();
      const cashWallet = wallets[0]?.accounts?.[0]?.address;
      if (!cashWallet) {
        throw new Error('Bank wallet not provisioned');
      }

      const pseudo = pseudoFromEmail(email);

      // Idempotent upsert. Returning users get their existing record back.
      const profile = await finalizeOAuthAuth({
        sessionToken,
        email,
        pseudo,
        cashWallet,
        authMethod,
      });

      // Hydrate locally-persisted stealth wallet (the backend doesn't track
      // it) so AuthContext is whole on first paint.
      const persistedStealf = await readPersistedStealfWallet();
      const enriched = persistedStealf
        ? { ...profile, stealfWallet: persistedStealf }
        : profile;

      // Drop any stale cache so post-login fetches always hit the network.
      queryClient.removeQueries({
        queryKey: balanceQueries.byAddress(cashWallet),
      });
      queryClient.removeQueries({
        queryKey: historyQueries.byAddress(cashWallet),
      });

      // Warm balance + history so the Bank tab paints fresh data with no
      // spinner on first frame.
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
    },
    [queryClient, setSession, setUser],
  );

  const runOAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      const tk = turnkeyRef.current;
      const handler =
        provider === 'google' ? tk.handleGoogleOauth : tk.handleAppleOauth;
      if (__DEV__) {
        console.log(
          `[useAuthFlow] runOAuth ${provider} start, clientState=`,
          tk.clientState,
          'handler=',
          typeof handler,
        );
      }
      setIsLoading(true);
      setError(null);
      try {
        await handler();
        if (__DEV__) console.log(`[useAuthFlow] ${provider} OAuth resolved`);
        await finalizePostAuth(provider);
        if (__DEV__) console.log(`[useAuthFlow] ${provider} finalize done`);
      } catch (err) {
        if (__DEV__) console.error(`[useAuthFlow] ${provider} threw:`, err);
        if (!isCancellationError(err)) {
          setError(toMessage(err));
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [finalizePostAuth],
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
        await turnkeyRef.current.completeOtp({
          otpId,
          otpCode,
          contact: email,
          otpType: OtpType.Email,
        });
        await finalizePostAuth('email', email);
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
    error,
    isClientReady,
  };
}

// Pseudo derived from the email local-part. Matches the User schema's
// `username` regex (alphanumeric + underscore, 3-20 chars). Fallback to a
// random suffix if the local-part doesn't survive sanitization (e.g. only
// punctuation, very rare).
function pseudoFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const sanitized = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  if (sanitized.length >= 3) return sanitized;
  return `user${Math.floor(Math.random() * 1_000_000)}`;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Authentication failed';
}

function isCancellationError(err: unknown): boolean {
  const msg = String((err as Error | undefined)?.message ?? '').toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('interrupt') ||
    msg.includes('user closed')
  );
}
