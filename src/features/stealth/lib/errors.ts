import {
  isClaimUtxoError,
  isCreateUtxoError,
  isEncryptedDepositError,
  isEncryptedWithdrawalError,
  isFetchUtxosError,
  isRegistrationError,
} from '@umbra-privacy/sdk';

export {
  isClaimUtxoError,
  isCreateUtxoError,
  isEncryptedDepositError,
  isEncryptedWithdrawalError,
  isFetchUtxosError,
  isRegistrationError,
};

export type StealthOp =
  | 'register'
  | 'deposit'
  | 'depositFromBank'
  | 'withdraw'
  | 'sendPrivate'
  | 'selfShield'
  | 'claimReceived'
  | 'claimSelfToPublic'
  | 'fetchClaims'
  | 'fetchBalances';

export type StealthErrorCode =
  | 'REGISTRATION_REJECTED'
  | 'REGISTRATION_PROOF_FAILED'
  | 'USER_NOT_REGISTERED'
  | 'RECEIVER_NOT_REGISTERED'
  | 'INSUFFICIENT_BALANCE'
  | 'ZK_PROOF_ERROR'
  | 'USER_CANCELLED'
  | 'TX_TIMEOUT'
  | 'TX_VALIDATION_FAILED'
  | 'RPC_ERROR'
  | 'INDEXER_ERROR'
  | 'VERIFYING_KEY_NOT_INITIALIZED'
  | 'STALE_MERKLE_PROOF'
  | 'SIGNING_FAILED'
  | 'UNKNOWN';

export class StealthError extends Error {
  code: StealthErrorCode;
  op: StealthOp;
  stage?: string;
  userMessage: string;
  override cause?: unknown;

  constructor(args: {
    code: StealthErrorCode;
    op: StealthOp;
    rawMessage: string;
    userMessage: string;
    stage?: string;
    cause?: unknown;
  }) {
    super(args.rawMessage);
    this.name = 'StealthError';
    this.code = args.code;
    this.op = args.op;
    this.stage = args.stage;
    this.userMessage = args.userMessage;
    this.cause = args.cause;
  }
}

const MSG: Record<StealthErrorCode, string> = {
  REGISTRATION_REJECTED: 'Registration cancelled.',
  REGISTRATION_PROOF_FAILED: 'Failed to generate proof. Please try again.',
  USER_NOT_REGISTERED:
    'Your stealth wallet is not registered yet. Try again in a few seconds.',
  RECEIVER_NOT_REGISTERED:
    'Recipient is not a Stealf user yet. Ask them to set up their stealth wallet first.',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction.',
  ZK_PROOF_ERROR: 'Failed to generate the privacy proof. Please try again.',
  USER_CANCELLED: 'Transaction cancelled.',
  TX_TIMEOUT:
    'Confirmation timed out. The transaction may still have landed — please check your balance before retrying.',
  TX_VALIDATION_FAILED: 'Transaction pre-flight failed. Please retry.',
  RPC_ERROR: 'Network error. Please check your connection and try again.',
  INDEXER_ERROR: 'Could not reach the network. Please check your connection.',
  VERIFYING_KEY_NOT_INITIALIZED:
    'Stealth protocol is not fully deployed on this network. Please contact support.',
  STALE_MERKLE_PROOF: 'This claim is out of date. Please refresh and try again.',
  SIGNING_FAILED: 'Signing failed. Please try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

function rawMessageOf(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string };
  return e?.cause?.message || e?.message || 'Operation failed';
}

function build(
  err: unknown,
  op: StealthOp,
  code: StealthErrorCode,
  stage?: string,
  override?: string,
): StealthError {
  const e = err as { cause?: unknown };
  return new StealthError({
    code,
    op,
    stage,
    rawMessage: rawMessageOf(err),
    userMessage: override ?? MSG[code],
    cause: e?.cause ?? err,
  });
}

/**
 * Parse a raw SDK error into a `StealthError` with a stable code and a
 * user-facing message. Uses Umbra's typed guards first, then falls back to
 * message inspection for the long tail.
 */
export function parseStealthError(err: unknown, op: StealthOp): StealthError {
  if (err instanceof StealthError) return err;

  if (isRegistrationError(err)) {
    switch (err.stage) {
      case 'master-seed-derivation':
      case 'transaction-sign':
        return build(err, op, 'REGISTRATION_REJECTED', err.stage);
      case 'zk-proof-generation':
        return build(err, op, 'REGISTRATION_PROOF_FAILED', err.stage);
      case 'account-fetch':
        return build(err, op, 'RPC_ERROR', err.stage);
      case 'transaction-send':
        return build(err, op, 'TX_TIMEOUT', err.stage);
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  if (isEncryptedDepositError(err)) {
    switch (err.stage) {
      case 'validation':
        return build(err, op, 'UNKNOWN', err.stage, 'Invalid deposit parameters.');
      case 'mint-fetch':
      case 'account-fetch':
        return build(err, op, 'RPC_ERROR', err.stage);
      case 'transaction-sign':
        return build(
          err,
          op,
          op === 'depositFromBank' ? 'SIGNING_FAILED' : 'USER_CANCELLED',
          err.stage,
        );
      case 'transaction-send': {
        const e = err as { cause?: { context?: { logs?: string[] } } };
        const logs = e?.cause?.context?.logs ?? [];
        if (logs.some((l) => /insufficient/i.test(l))) {
          return build(err, op, 'INSUFFICIENT_BALANCE', err.stage);
        }
        return build(err, op, 'TX_TIMEOUT', err.stage);
      }
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  if (isEncryptedWithdrawalError(err)) {
    switch (err.stage) {
      case 'validation':
        return build(err, op, 'INSUFFICIENT_BALANCE', err.stage);
      case 'mint-fetch':
        return build(err, op, 'RPC_ERROR', err.stage);
      case 'transaction-sign':
        return build(err, op, 'USER_CANCELLED', err.stage);
      case 'transaction-send':
        return build(err, op, 'TX_TIMEOUT', err.stage);
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  if (isCreateUtxoError(err)) {
    switch (err.stage) {
      case 'zk-proof-generation':
        return build(err, op, 'ZK_PROOF_ERROR', err.stage);
      case 'transaction-sign':
        return build(err, op, 'USER_CANCELLED', err.stage);
      case 'account-fetch':
        return build(err, op, 'RPC_ERROR', err.stage);
      case 'transaction-send':
        return build(err, op, 'TX_TIMEOUT', err.stage);
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  if (isClaimUtxoError(err)) {
    switch (err.stage) {
      case 'zk-proof-generation':
        return build(err, op, 'ZK_PROOF_ERROR', err.stage);
      case 'transaction-sign':
        return build(err, op, 'USER_CANCELLED', err.stage);
      case 'transaction-validate':
        return build(err, op, 'STALE_MERKLE_PROOF', err.stage);
      case 'transaction-send':
        return build(err, op, 'TX_TIMEOUT', err.stage);
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  if (isFetchUtxosError(err)) {
    switch (err.stage) {
      case 'indexer-fetch':
      case 'proof-fetch':
        return build(err, op, 'INDEXER_ERROR', err.stage);
      default:
        return build(err, op, 'UNKNOWN', err.stage);
    }
  }

  const rawMessage = rawMessageOf(err);
  const e = err as { cause?: { context?: { logs?: string[] } } };
  const simulationLogs = e?.cause?.context?.logs ?? [];

  if (/receiver is not registered/i.test(rawMessage)) {
    return build(err, op, 'RECEIVER_NOT_REGISTERED');
  }
  if (/user is not registered|account.*not.*initialised|not registered/i.test(rawMessage)) {
    return build(err, op, 'USER_NOT_REGISTERED');
  }
  if (simulationLogs.some((l) => /zero_knowledge_verifying_key/i.test(l))) {
    return build(err, op, 'VERIFYING_KEY_NOT_INITIALIZED');
  }
  if (
    /insufficient/i.test(rawMessage) ||
    simulationLogs.some((l) => /insufficient (funds|lamports)/i.test(l))
  ) {
    return build(err, op, 'INSUFFICIENT_BALANCE');
  }
  if (/rpc|network|fetch|timeout/i.test(rawMessage)) {
    return build(err, op, 'RPC_ERROR');
  }

  return build(err, op, 'UNKNOWN');
}
