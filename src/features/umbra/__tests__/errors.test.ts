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
    const out = parseStealthError(
      err,
      'getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction',
    );
    expect(out.code).toBe('USER_NOT_REGISTERED');
    expect(out.op).toBe(
      'getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction',
    );
  });

  it('classifies "receiver is not registered" -> RECEIVER_NOT_REGISTERED', () => {
    const err = new Error('receiver is not registered');
    const out = parseStealthError(
      err,
      'getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction',
    );
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
        context: {
          logs: ['Program log: zero_knowledge_verifying_key not set'],
        },
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

/**
 * The RPC embeds simulation logs in the *message* rather than in
 * `cause.context.logs`, which is how a fee failure was reaching the user as
 * "Insufficient balance". Shape taken verbatim from a real devnet failure.
 */
function rpcErrorWithEmbeddedLogs(): Error {
  return new Error(
    'tx_pipeline: RPC error: sendTransaction error: ' +
      JSON.stringify({
        code: -32002,
        data: {
          err: { InstructionError: [2, { Custom: 1 }] },
          logs: [
            'Program log: Instruction: ClaimIntoNewSharedBalanceV18',
            'Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ invoke [2]',
            'Program log: Instruction: QueueComputation',
            'Transfer: insufficient lamports 4519916, need 10871520',
            'Program 11111111111111111111111111111111 failed: custom program error: 0x1',
          ],
        },
        message: 'Transaction simulation failed: ...custom program error: 0x1',
      }),
  );
}

describe('lamport shortfalls are attributed to the right payer', () => {
  // Claims are broadcast by Umbra's relayer, which pays the fees — that is the
  // point, a recipient needs no SOL to claim. Telling them to top up their own
  // wallet is both wrong and unactionable.
  it.each(['claimReceived', 'claimSelfToPublic'] as const)(
    '%s reports RELAYER_OUT_OF_FUNDS, not a user balance problem',
    (op) => {
      const out = parseStealthError(rpcErrorWithEmbeddedLogs(), op);

      expect(out.code).toBe('RELAYER_OUT_OF_FUNDS');
      expect(out.userMessage).not.toMatch(/insufficient balance/i);
      // Must not instruct the user to send SOL — it would not help.
      expect(out.userMessage).not.toMatch(/send .*sol|top ?up your wallet/i);
    },
  );

  // deposit / transfer / withdraw are paid by the user's own wallet.
  it.each(['deposit', 'withdraw'] as const)(
    '%s still reports INSUFFICIENT_FEE_SOL',
    (op) => {
      const out = parseStealthError(rpcErrorWithEmbeddedLogs(), op);

      expect(out.code).toBe('INSUFFICIENT_FEE_SOL');
      expect(out.userMessage).toMatch(/sol/i);
    },
  );

  // Regression pin: logsOf() only read cause.context.logs, so with the logs
  // embedded in the message the 'fee' branch was dead and everything fell
  // through to 'balance'.
  it('detects the lamport shortfall even when logs are only in the message', () => {
    const out = parseStealthError(rpcErrorWithEmbeddedLogs(), 'deposit');

    expect(out.code).not.toBe('INSUFFICIENT_BALANCE');
  });

  it('still reads logs from cause.context.logs when present', () => {
    const err = {
      message: 'tx failed',
      cause: {
        context: {
          logs: ['Transfer: insufficient lamports 4519916, need 10871520'],
        },
      },
    };

    expect(parseStealthError(err, 'deposit').code).toBe('INSUFFICIENT_FEE_SOL');
    expect(parseStealthError(err, 'claimReceived').code).toBe(
      'RELAYER_OUT_OF_FUNDS',
    );
  });

  it('leaves a genuine token shortfall classified as a balance problem', () => {
    const err = new Error('insufficient funds for the requested amount');

    expect(parseStealthError(err, 'claimReceived').code).toBe(
      'INSUFFICIENT_BALANCE',
    );
  });
});
