import { describe, expect, it } from 'vitest';
import { parseStealthError, StealthError } from '../lib/errors';

describe('parseStealthError', () => {
  it('returns the same error if it is already a StealthError', () => {
    const original = new StealthError({
      code: 'USER_CANCELLED',
      op: 'register',
      rawMessage: 'cancelled',
      userMessage: 'cancelled',
    });
    expect(parseStealthError(original, 'register')).toBe(original);
  });

  it('classifies "user is not registered" -> USER_NOT_REGISTERED', () => {
    const err = new Error('user is not registered yet');
    const out = parseStealthError(err, 'sendPrivate');
    expect(out.code).toBe('USER_NOT_REGISTERED');
    expect(out.op).toBe('sendPrivate');
  });

  it('classifies "receiver is not registered" -> RECEIVER_NOT_REGISTERED', () => {
    const err = new Error('receiver is not registered');
    const out = parseStealthError(err, 'sendPrivate');
    expect(out.code).toBe('RECEIVER_NOT_REGISTERED');
  });

  it('classifies insufficient funds via simulation logs', () => {
    const err = {
      message: 'tx failed',
      cause: { context: { logs: ['Program: insufficient funds for fee'] } },
    };
    const out = parseStealthError(err, 'deposit');
    expect(out.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('classifies "verifying key" log as VERIFYING_KEY_NOT_INITIALIZED', () => {
    const err = {
      message: 'tx failed',
      cause: {
        context: { logs: ['Program log: zero_knowledge_verifying_key not set'] },
      },
    };
    const out = parseStealthError(err, 'register');
    expect(out.code).toBe('VERIFYING_KEY_NOT_INITIALIZED');
  });

  it('classifies network keywords as RPC_ERROR', () => {
    const err = new Error('rpc timeout while fetching latest blockhash');
    const out = parseStealthError(err, 'register');
    expect(out.code).toBe('RPC_ERROR');
  });

  it('falls back to UNKNOWN for unrecognised errors', () => {
    const err = new Error('some weird thing');
    const out = parseStealthError(err, 'register');
    expect(out.code).toBe('UNKNOWN');
    expect(out.userMessage).toMatch(/something went wrong/i);
  });
});
