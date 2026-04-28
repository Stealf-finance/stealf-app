export type SignUpStep = 'invite' | 'handle' | 'email' | 'verifying' | 'passkey' | 'done';

export interface SignUpState {
  step: SignUpStep;
  invite: string;
  handle: string;
  email: string;
  preAuthToken: string | null;
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
  preAuthToken: null,
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
  | { type: 'availability/ok'; preAuthToken: string }
  | { type: 'verification/done' }
  | { type: 'error'; message: string; retryable: boolean }
  | { type: 'error/clear' }
  | { type: 'hydrate'; invite?: string; handle?: string; email: string; preAuthToken: string }
  | { type: 'reset' };

export function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
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
    case 'availability/ok':
      return { ...state, preAuthToken: action.preAuthToken, step: 'verifying', error: null };
    case 'verification/done':
      return { ...state, step: 'passkey', error: null };
    case 'error':
      return { ...state, error: action.message, errorRetryable: action.retryable, loading: false };
    case 'error/clear':
      return { ...state, error: null, errorRetryable: false };
    case 'hydrate':
      return {
        ...state,
        invite: action.invite ?? state.invite,
        handle: action.handle ?? state.handle,
        email: action.email,
        preAuthToken: action.preAuthToken,
        step: 'verifying',
      };
    case 'reset':
      return initialSignUpState;
    default:
      return state;
  }
}
