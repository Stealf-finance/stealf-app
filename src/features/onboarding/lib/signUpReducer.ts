export type SignUpStep =
  | 'invite'
  | 'handle'
  | 'email'
  | 'verifying'
  | 'passkey'
  | 'done';

export type CodeError =
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'CODE_ALREADY_USED'
  | 'TOO_MANY_ATTEMPTS';

export interface SignUpState {
  step: SignUpStep;
  invite: string;
  handle: string;
  email: string;
  /** Backend-issued onboarding session, kept in memory only (TTL 15min server-side). */
  sessionId: string | null;
  /** Code currently being typed in the verify step. */
  codeDigits: string;
  /** Last code submission error from the backend, if any. */
  codeError: CodeError | null;
  /** Seconds remaining before the user can request a new code (rate limit). */
  resendCooldown: number;
  termsAccepted: boolean;
  loading: boolean;
  error: string | null;
  errorRetryable: boolean;
}

export const initialSignUpState: SignUpState = {
  step: 'invite',
  invite: '',
  handle: '',
  email: '',
  sessionId: null,
  codeDigits: '',
  codeError: null,
  resendCooldown: 0,
  termsAccepted: false,
  loading: false,
  error: null,
  errorRetryable: false,
};

export type SignUpAction =
  | { type: 'set/invite'; value: string }
  | { type: 'set/handle'; value: string }
  | { type: 'set/email'; value: string }
  | { type: 'set/terms'; value: boolean }
  | { type: 'set/loading'; value: boolean }
  | { type: 'goto'; step: SignUpStep }
  | { type: 'session/started'; sessionId: string }
  | { type: 'name/ok' }
  | { type: 'email/ok' }
  | { type: 'code/digit'; value: string }
  | { type: 'code/error'; code: CodeError }
  | { type: 'code/clear' }
  | { type: 'verification/done' }
  | { type: 'resend/cooldown'; seconds: number }
  | { type: 'resend/tick' }
  | { type: 'error'; message: string; retryable: boolean }
  | { type: 'error/clear' }
  | { type: 'reset' };

export function signUpReducer(
  state: SignUpState,
  action: SignUpAction,
): SignUpState {
  switch (action.type) {
    case 'set/invite':
      return { ...state, invite: action.value };
    case 'set/handle':
      return { ...state, handle: action.value };
    case 'set/email':
      return { ...state, email: action.value };
    case 'set/terms':
      return { ...state, termsAccepted: action.value };
    case 'set/loading':
      return { ...state, loading: action.value };
    case 'goto':
      return { ...state, step: action.step, error: null };
    case 'session/started':
      return {
        ...state,
        sessionId: action.sessionId,
        step: 'handle',
        error: null,
      };
    case 'name/ok':
      return { ...state, step: 'email', error: null };
    case 'email/ok':
      return {
        ...state,
        step: 'verifying',
        codeDigits: '',
        codeError: null,
        error: null,
      };
    case 'code/digit':
      // Drop everything that isn't a digit; cap to 6 chars.
      return {
        ...state,
        codeDigits: action.value.replace(/\D/g, '').slice(0, 6),
        codeError: null,
      };
    case 'code/error':
      return {
        ...state,
        codeError: action.code,
        codeDigits: '',
        loading: false,
      };
    case 'code/clear':
      return { ...state, codeDigits: '', codeError: null };
    case 'verification/done':
      return { ...state, step: 'passkey', error: null };
    case 'resend/cooldown':
      return { ...state, resendCooldown: action.seconds };
    case 'resend/tick':
      return {
        ...state,
        resendCooldown: Math.max(0, state.resendCooldown - 1),
      };
    case 'error':
      return {
        ...state,
        error: action.message,
        errorRetryable: action.retryable,
        loading: false,
      };
    case 'error/clear':
      return { ...state, error: null, errorRetryable: false };
    case 'reset':
      return initialSignUpState;
    default:
      return state;
  }
}
