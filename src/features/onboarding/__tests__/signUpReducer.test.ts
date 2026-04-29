import { describe, it, expect } from 'vitest';
import {
  initialSignUpState,
  signUpReducer,
} from '../lib/signUpReducer';

describe('signUpReducer', () => {
  it('happy-path walks every step in order', () => {
    let s = initialSignUpState;
    expect(s.step).toBe('invite');

    s = signUpReducer(s, { type: 'set/invite', value: 'STEALF' });
    expect(s.invite).toBe('STEALF');

    s = signUpReducer(s, { type: 'session/started', sessionId: 'sid_1' });
    expect(s.step).toBe('handle');
    expect(s.sessionId).toBe('sid_1');

    s = signUpReducer(s, { type: 'set/handle', value: 'thomas' });
    s = signUpReducer(s, { type: 'name/ok' });
    expect(s.step).toBe('email');

    s = signUpReducer(s, { type: 'set/email', value: 'a@b.co' });
    s = signUpReducer(s, { type: 'email/ok' });
    expect(s.step).toBe('verifying');
    expect(s.codeDigits).toBe('');
    expect(s.codeError).toBeNull();

    s = signUpReducer(s, { type: 'code/digit', value: '123456' });
    expect(s.codeDigits).toBe('123456');

    s = signUpReducer(s, { type: 'verification/done' });
    expect(s.step).toBe('passkey');

    s = signUpReducer(s, { type: 'goto', step: 'done' });
    expect(s.step).toBe('done');
  });

  it('strips non-digits and caps the code at 6 chars', () => {
    let s = initialSignUpState;
    s = signUpReducer(s, { type: 'code/digit', value: 'abc12-345 67' });
    expect(s.codeDigits).toBe('123456');

    s = signUpReducer(s, { type: 'code/digit', value: '99' });
    expect(s.codeDigits).toBe('99');
  });

  it('clears the typed code and surfaces a structured error', () => {
    let s: typeof initialSignUpState = {
      ...initialSignUpState,
      step: 'verifying',
      codeDigits: '111111',
      loading: true,
    };
    s = signUpReducer(s, { type: 'code/error', code: 'INVALID_CODE' });
    expect(s.codeDigits).toBe('');
    expect(s.codeError).toBe('INVALID_CODE');
    expect(s.loading).toBe(false);
  });

  it('starts a resend cooldown and ticks down to 0', () => {
    let s = signUpReducer(initialSignUpState, {
      type: 'resend/cooldown',
      seconds: 3,
    });
    expect(s.resendCooldown).toBe(3);
    s = signUpReducer(s, { type: 'resend/tick' });
    s = signUpReducer(s, { type: 'resend/tick' });
    s = signUpReducer(s, { type: 'resend/tick' });
    s = signUpReducer(s, { type: 'resend/tick' }); // extra tick should not go below 0
    expect(s.resendCooldown).toBe(0);
  });

  it('reset returns to initial state and drops sessionId', () => {
    const s = {
      ...initialSignUpState,
      step: 'verifying' as const,
      sessionId: 'sid_x',
      codeDigits: '999999',
    };
    const next = signUpReducer(s, { type: 'reset' });
    expect(next).toEqual(initialSignUpState);
  });
});
