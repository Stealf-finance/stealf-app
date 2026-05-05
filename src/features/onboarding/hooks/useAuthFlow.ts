import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { OtpType } from '@turnkey/core';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { useAuth, readPersistedStealfWallet } from '../context/AuthContext';
import { finalizeOAuthAuth, type AuthMethod } from '../api/onboarding';
import { userProfileQueries } from '../api/userProfile';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';

type FinalizeArgs = {
  authMethod: AuthMethod;
  sessionToken: string;
  email: string | undefined;
};

export function useAuthFlow() {
  const turnkey = useTurnkey();
  const turnkeyRef = useRef(turnkey);
  turnkeyRef.current = turnkey;

  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingOauth, setPendingOauth] = useState<AuthMethod | null>(null);

  const finalizingRef = useRef(false);

  const isClientReady = turnkey.clientState === ClientState.Ready;

  const finalizePostAuth = useCallback(
    async ({ authMethod, sessionToken, email }: FinalizeArgs) => {
      const tk = turnkeyRef.current;

      const wallets = tk.wallets.length
        ? tk.wallets
        : await tk.refreshWallets();
      const cashWallet = wallets[0]?.accounts?.[0]?.address;
      if (!cashWallet) {
        throw new Error('Bank wallet not provisioned');
      }

      const profile = await finalizeOAuthAuth({
        sessionToken,
        email,
        pseudo: email ? pseudoFromEmail(email) : undefined,
        cashWallet,
        authMethod,
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
    },
    [queryClient, setSession, setUser],
  );

  useEffect(() => {
    if (!pendingOauth) return;
    if (finalizingRef.current) return;
    const sessionToken = turnkey.session?.token;
    if (!sessionToken) return;
    if (turnkey.wallets.length === 0) return;

    const email = turnkey.user?.userEmail;
    finalizingRef.current = true;
    const method = pendingOauth;
    setPendingOauth(null);
    finalizePostAuth({ authMethod: method, sessionToken, email })
      .catch((err) => {
        if (__DEV__) console.error('[useAuthFlow] finalize failed:', err);
        setError(toMessage(err));
      })
      .finally(() => {
        finalizingRef.current = false;
        setIsLoading(false);
      });
  }, [
    pendingOauth,
    turnkey.session?.token,
    turnkey.user?.userEmail,
    turnkey.wallets.length,
    finalizePostAuth,
  ]);

  const runOAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      const tk = turnkeyRef.current;
      const handler =
        provider === 'google' ? tk.handleGoogleOauth : tk.handleAppleOauth;
      setIsLoading(true);
      setError(null);
      try {

        setPendingOauth(provider);
        await handler();

      } catch (err) {
        setPendingOauth(null);
        setIsLoading(false);

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
    error,
    isClientReady,
  };
}

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

  if (msg.includes('did not complete successfully')) return true;
  return (
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('interrupt') ||
    msg.includes('user closed')
  );
}
