import { useCallback, useEffect, useReducer } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { BANK_WALLET_CONFIG } from '@/src/services/turnkey/config';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { checkAvailability, finalizeAuth, sendMagicLink } from '../api/onboarding';
import { useAuth } from '../context/AuthContext';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from '../lib/onboardingDraft';
import {
  classifyPasskeyError,
  purgeTurnkeyState,
  sanitizePasskeyDisplayName,
} from '../lib/passkeyHelpers';
import { userProfileQueries } from '../api/userProfile';
import {
  initialSignUpState,
  signUpReducer,
  type SignUpState,
} from '../lib/signUpReducer';

export interface UseSignUpReturn {
  state: SignUpState;
  setInvite: (v: string) => void;
  setHandle: (v: string) => void;
  setEmail: (v: string) => void;
  setTermsAccepted: (v: boolean) => void;
  goto: (step: SignUpState['step']) => void;

  startVerification: () => Promise<{ ok: boolean; message?: string }>;
  resendMagicLink: () => Promise<{ ok: boolean; message?: string }>;
  onEmailVerified: (data: { email: string; pseudo: string }) => void;
  createPasskey: (opts?: { purgeFirst?: boolean }) => Promise<{ ok: boolean; message?: string }>;

  clearError: () => void;
  reset: () => void;
  isClientReady: boolean;
}

export function useSignUp(): UseSignUpReturn {
  const [state, dispatch] = useReducer(signUpReducer, initialSignUpState);
  const { signUpWithPasskey, refreshWallets, clientState } = useTurnkey();
  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();
  const isClientReady = clientState === ClientState.Ready;

  useEffect(() => {
    let cancelled = false;
    loadOnboardingDraft().then((draft) => {
      if (cancelled || !draft) return;
      dispatch({
        type: 'hydrate',
        invite: draft.invite,
        handle: draft.handle,
        email: draft.email,
        preAuthToken: draft.preAuthToken,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setInvite = useCallback((value: string) => dispatch({ type: 'set/invite', value }), []);
  const setHandle = useCallback((value: string) => dispatch({ type: 'set/handle', value }), []);
  const setEmail = useCallback((value: string) => dispatch({ type: 'set/email', value }), []);
  const setTermsAccepted = useCallback(
    (value: boolean) => dispatch({ type: 'set/terms', value }),
    [],
  );
  const goto = useCallback(
    (step: SignUpState['step']) => dispatch({ type: 'goto', step }),
    [],
  );
  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    void clearOnboardingDraft();
  }, []);

  const startVerification = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    dispatch({ type: 'set/loading', value: true });
    try {
      const result = await checkAvailability({
        email: state.email,
        pseudo: state.handle,
        inviteCode: state.invite || undefined,
      });

      if (!result.canProceed) {
        const messages: string[] = [];
        const unavailable = result.unavailable ?? [];
        if (unavailable.includes(1)) messages.push('This email is already taken.');
        if (unavailable.includes(2)) messages.push('This username is already taken.');
        for (const e of result.errors ?? []) messages.push(e.message);
        if (messages.length === 0) messages.push('Unable to create account.');
        const message = messages.join('\n');
        dispatch({ type: 'error', message, retryable: true });
        return { ok: false, message };
      }

      if (!result.preAuthToken) {
        const message = 'Backend did not return a verification token.';
        dispatch({ type: 'error', message, retryable: false });
        return { ok: false, message };
      }

      await saveOnboardingDraft({
        invite: state.invite,
        handle: state.handle,
        email: state.email,
        preAuthToken: result.preAuthToken,
      });

      dispatch({ type: 'availability/ok', preAuthToken: result.preAuthToken });
      return { ok: true };
    } catch (err: any) {
      const message = err?.message ?? 'Failed to start verification';
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, [state.email, state.handle, state.invite]);

  const resendMagicLink = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!state.email || !state.handle) {
      return { ok: false, message: 'Missing email or handle' };
    }
    dispatch({ type: 'set/loading', value: true });
    try {
      await sendMagicLink({
        email: state.email,
        pseudo: state.handle,
        preAuthToken: state.preAuthToken ?? undefined,
      });
      return { ok: true, message: 'Magic link sent.' };
    } catch (err: any) {
      const message = err?.message ?? 'Failed to resend magic link';
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, [state.email, state.handle, state.preAuthToken]);

  const onEmailVerified = useCallback(
    (data: { email: string; pseudo: string }) => {
      if (data.email !== state.email || data.pseudo !== state.handle) {
        dispatch({ type: 'set/email', value: data.email });
        dispatch({ type: 'set/handle', value: data.pseudo });
      }
      dispatch({ type: 'verification/done' });
    },
    [state.email, state.handle],
  );

  const createPasskey = useCallback(
    async (opts?: { purgeFirst?: boolean }): Promise<{ ok: boolean; message?: string }> => {
      if (!isClientReady) {
        const message = 'App is still starting up. Please try again in a moment.';
        dispatch({ type: 'error', message, retryable: true });
        return { ok: false, message };
      }

      dispatch({ type: 'set/loading', value: true });
      dispatch({ type: 'error/clear' });

      try {
        if (opts?.purgeFirst) await purgeTurnkeyState();

        const passkeyDisplayName = `Stealf - ${sanitizePasskeyDisplayName(state.handle)}`;
        const authResult = await signUpWithPasskey({
          passkeyDisplayName,
          createSubOrgParams: {
            subOrgName: `User ${state.email}`,
            customWallet: BANK_WALLET_CONFIG,
          },
        });

        const sessionToken = authResult?.sessionToken;
        if (!sessionToken) throw new Error('No session token received from Turnkey');

        const wallets = await refreshWallets();
        const bankWallet = wallets?.[0]?.accounts?.[0]?.address;
        if (!bankWallet) throw new Error('Failed to retrieve bank wallet address');

        const profile = await finalizeAuth({
          sessionToken,
          preAuthToken: state.preAuthToken ?? undefined,
          email: state.email,
          pseudo: state.handle,
          bankWallet,
        });

        queryClient.setQueryData(userProfileQueries.byBankWallet(bankWallet), profile);
        await walletKeyCache.warmup();

        setSession({ sessionToken });
        setUser(profile);
        await clearOnboardingDraft();

        dispatch({ type: 'goto', step: 'done' });
        return { ok: true };
      } catch (err: unknown) {
        if (__DEV__) console.error('[useSignUp] passkey error:', err);
        const { retryable, userMessage } = classifyPasskeyError(err);
        dispatch({ type: 'error', message: userMessage, retryable });
        return { ok: false, message: userMessage };
      } finally {
        dispatch({ type: 'set/loading', value: false });
      }
    },
    [
      isClientReady,
      signUpWithPasskey,
      refreshWallets,
      state.handle,
      state.email,
      state.preAuthToken,
      setSession,
      setUser,
      queryClient,
    ],
  );

  return {
    state,
    setInvite,
    setHandle,
    setEmail,
    setTermsAccepted,
    goto,
    startVerification,
    resendMagicLink,
    onEmailVerified,
    createPasskey,
    clearError,
    reset,
    isClientReady,
  };
}
