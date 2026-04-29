import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { BANK_WALLET_CONFIG } from '@/src/services/turnkey/config';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import {
  finalizeAuth,
  OnboardingError,
  resendCode as resendCodeApi,
  submitEmail,
  submitInviteCode,
  submitName,
  submitVerifyCode,
} from '../api/onboarding';
import { useAuth } from '../context/AuthContext';
import {
  classifyPasskeyError,
  purgeTurnkeyState,
  sanitizePasskeyDisplayName,
} from '../lib/passkeyHelpers';
import { userProfileQueries } from '../api/userProfile';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import type { BalanceResponse, HistoryResponse } from '@/src/features/bank/types';
import {
  initialSignUpState,
  signUpReducer,
  type CodeError,
  type SignUpState,
} from '../lib/signUpReducer';

const RESEND_COOLDOWN_DEFAULT_S = 30;
const ANTI_ENUMERATION_HOLD_MS = 600;

interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface UseSignUpReturn {
  state: SignUpState;
  setInvite: (v: string) => void;
  setHandle: (v: string) => void;
  setEmail: (v: string) => void;
  setCodeDigits: (v: string) => void;
  setTermsAccepted: (v: boolean) => void;
  goto: (step: SignUpState['step']) => void;

  submitInvite: () => Promise<ActionResult>;
  submitHandle: () => Promise<ActionResult>;
  submitEmail: () => Promise<ActionResult>;
  submitCode: () => Promise<ActionResult>;
  resendCode: () => Promise<ActionResult>;
  createPasskey: (opts?: { purgeFirst?: boolean }) => Promise<ActionResult>;

  clearError: () => void;
  reset: () => void;
  isClientReady: boolean;
}

const CODE_ERROR_FROM_API: Partial<Record<string, CodeError>> = {
  INVALID_CODE: 'INVALID_CODE',
  CODE_EXPIRED: 'CODE_EXPIRED',
  CODE_ALREADY_USED: 'CODE_ALREADY_USED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
};

export function useSignUp(): UseSignUpReturn {
  const [state, dispatch] = useReducer(signUpReducer, initialSignUpState);
  const { signUpWithPasskey, refreshWallets, clientState } = useTurnkey();
  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();
  const isClientReady = clientState === ClientState.Ready;

  // Drive the resend cooldown countdown.
  const cooldown = state.resendCooldown;
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => dispatch({ type: 'resend/tick' }), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const setInvite = useCallback(
    (value: string) => dispatch({ type: 'set/invite', value }),
    [],
  );
  const setHandle = useCallback(
    (value: string) => dispatch({ type: 'set/handle', value }),
    [],
  );
  const setEmail = useCallback(
    (value: string) => dispatch({ type: 'set/email', value }),
    [],
  );
  const setCodeDigits = useCallback(
    (value: string) => dispatch({ type: 'code/digit', value }),
    [],
  );
  const setTermsAccepted = useCallback(
    (value: boolean) => dispatch({ type: 'set/terms', value }),
    [],
  );
  const goto = useCallback(
    (step: SignUpState['step']) => dispatch({ type: 'goto', step }),
    [],
  );
  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  // Stable refs so action callbacks don't re-create on every keystroke.
  const stateRef = useRef(state);
  stateRef.current = state;

  const submitInvite = useCallback(async (): Promise<ActionResult> => {
    const invite = stateRef.current.invite.trim();
    if (!invite) {
      const message = 'Please enter your invite code.';
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    }
    dispatch({ type: 'set/loading', value: true });
    try {
      const { sessionId } = await submitInviteCode({ inviteCode: invite });
      dispatch({ type: 'session/started', sessionId });
      return { ok: true };
    } catch (err: unknown) {
      const message = errorToUserMessage(err, 'Could not validate invite code.');
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, []);

  const submitHandle = useCallback(async (): Promise<ActionResult> => {
    const sessionId = stateRef.current.sessionId;
    const pseudo = stateRef.current.handle.trim();
    if (!sessionId) {
      return { ok: false, message: 'Onboarding session missing.' };
    }
    dispatch({ type: 'set/loading', value: true });
    try {
      await submitName({ sessionId, pseudo });
      dispatch({ type: 'name/ok' });
      return { ok: true };
    } catch (err: unknown) {
      const message = errorToUserMessage(err, 'Could not save your handle.');
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, []);

  const submitEmailStep = useCallback(async (): Promise<ActionResult> => {
    const sessionId = stateRef.current.sessionId;
    const email = stateRef.current.email.trim();
    if (!sessionId) return { ok: false, message: 'Onboarding session missing.' };

    dispatch({ type: 'set/loading', value: true });
    const start = Date.now();
    try {
      await submitEmail({ sessionId, email });
      // Defense-in-depth against local-clock timing analysis: hold for at
      // least ANTI_ENUMERATION_HOLD_MS regardless of backend latency.
      const elapsed = Date.now() - start;
      if (elapsed < ANTI_ENUMERATION_HOLD_MS) {
        await new Promise((r) => setTimeout(r, ANTI_ENUMERATION_HOLD_MS - elapsed));
      }
      dispatch({ type: 'email/ok' });
      dispatch({ type: 'resend/cooldown', seconds: RESEND_COOLDOWN_DEFAULT_S });
      return { ok: true };
    } catch (err: unknown) {
      // Even on error, keep the hold so timing is constant.
      const elapsed = Date.now() - start;
      if (elapsed < ANTI_ENUMERATION_HOLD_MS) {
        await new Promise((r) => setTimeout(r, ANTI_ENUMERATION_HOLD_MS - elapsed));
      }
      const message = errorToUserMessage(err, 'Could not send the verification code.');
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, []);

  const submitCode = useCallback(async (): Promise<ActionResult> => {
    const sessionId = stateRef.current.sessionId;
    const code = stateRef.current.codeDigits;
    if (!sessionId) return { ok: false, message: 'Onboarding session missing.' };
    if (code.length !== 6) {
      return { ok: false, message: 'Enter the 6-digit code.' };
    }
    dispatch({ type: 'set/loading', value: true });
    try {
      await submitVerifyCode({ sessionId, code });
      dispatch({ type: 'verification/done' });
      return { ok: true };
    } catch (err: unknown) {
      const codeErr = codeErrorFrom(err);
      if (codeErr) {
        dispatch({ type: 'code/error', code: codeErr });
        return { ok: false, message: codeErrorMessage(codeErr) };
      }
      const message = errorToUserMessage(err, 'Could not verify the code.');
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, []);

  const resendCode = useCallback(async (): Promise<ActionResult> => {
    if (stateRef.current.resendCooldown > 0) {
      return { ok: false, message: 'Please wait before requesting a new code.' };
    }
    const sessionId = stateRef.current.sessionId;
    if (!sessionId) return { ok: false, message: 'Onboarding session missing.' };
    dispatch({ type: 'set/loading', value: true });
    try {
      await resendCodeApi({ sessionId });
      dispatch({ type: 'code/clear' });
      dispatch({ type: 'resend/cooldown', seconds: RESEND_COOLDOWN_DEFAULT_S });
      return { ok: true };
    } catch (err: unknown) {
      if (err instanceof OnboardingError && err.retryAfterSeconds) {
        dispatch({ type: 'resend/cooldown', seconds: err.retryAfterSeconds });
      }
      const message = errorToUserMessage(err, 'Could not resend the code.');
      dispatch({ type: 'error', message, retryable: true });
      return { ok: false, message };
    } finally {
      dispatch({ type: 'set/loading', value: false });
    }
  }, []);

  const createPasskey = useCallback(
    async (opts?: { purgeFirst?: boolean }): Promise<ActionResult> => {
      if (!isClientReady) {
        const message = 'App is still starting up. Please try again in a moment.';
        dispatch({ type: 'error', message, retryable: true });
        return { ok: false, message };
      }
      const sessionId = stateRef.current.sessionId;
      if (!sessionId) {
        const message = 'Onboarding session missing.';
        dispatch({ type: 'error', message, retryable: false });
        return { ok: false, message };
      }

      dispatch({ type: 'set/loading', value: true });
      dispatch({ type: 'error/clear' });

      try {
        if (opts?.purgeFirst) await purgeTurnkeyState();

        const passkeyDisplayName = `Stealf - ${sanitizePasskeyDisplayName(stateRef.current.handle)}`;
        const authResult = await signUpWithPasskey({
          passkeyDisplayName,
          createSubOrgParams: {
            subOrgName: `User ${stateRef.current.email}`,
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
          sessionId,
          email: stateRef.current.email,
          pseudo: stateRef.current.handle,
          bankWallet,
        });

        queryClient.setQueryData(
          userProfileQueries.byBankWallet(bankWallet),
          profile,
        );

        // A freshly created account has nothing on-chain yet. Seed the bank
        // queries with empty payloads so the Bank tab renders $0.00 + no
        // transactions immediately, without an unnecessary first fetch that
        // would just confirm what we already know.
        const emptyBalance: BalanceResponse = {
          address: bankWallet,
          tokens: [],
          totalUSD: 0,
        };
        const emptyHistory: HistoryResponse = {
          address: bankWallet,
          count: 0,
          transactions: [],
        };
        queryClient.setQueryData(
          balanceQueries.byAddress(bankWallet),
          emptyBalance,
        );
        queryClient.setQueryData(
          historyQueries.byAddress(bankWallet),
          emptyHistory,
        );

        await walletKeyCache.warmup();

        setSession({ sessionToken });
        setUser(profile);

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
    setCodeDigits,
    setTermsAccepted,
    goto,
    submitInvite,
    submitHandle,
    submitEmail: submitEmailStep,
    submitCode,
    resendCode,
    createPasskey,
    clearError,
    reset,
    isClientReady,
  };
}

function codeErrorFrom(err: unknown): CodeError | null {
  if (err instanceof OnboardingError) {
    return CODE_ERROR_FROM_API[err.code] ?? null;
  }
  return null;
}

function codeErrorMessage(code: CodeError): string {
  switch (code) {
    case 'INVALID_CODE':
      return 'That code is incorrect. Try again.';
    case 'CODE_EXPIRED':
      return 'That code expired. Tap "Resend" to get a new one.';
    case 'CODE_ALREADY_USED':
      return 'That code has already been used. Resend to get a new one.';
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many attempts. Please wait before trying again.';
  }
}

function errorToUserMessage(err: unknown, fallback: string): string {
  if (err instanceof OnboardingError) {
    switch (err.code) {
      case 'INVALID_INVITE':
        return 'That invite code is not recognised.';
      case 'INVITE_ALREADY_USED':
        return 'This invite has already been used.';
      case 'PSEUDO_TAKEN':
        return 'That username is already taken.';
      case 'PSEUDO_INVALID':
        return 'Username must be 3–20 letters, numbers, or underscores.';
      case 'EMAIL_INVALID':
        return 'That email address is not valid.';
      case 'EMAIL_TAKEN':
        return 'An account with this email already exists. Try signing in.';
      case 'ONBOARDING_SESSION_MISSING':
      case 'ONBOARDING_SESSION_EXPIRED':
        return 'Your onboarding session expired. Please start again.';
      case 'STEP_OUT_OF_ORDER':
        return 'Something went wrong with this step. Please start again.';
      default:
        break;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
