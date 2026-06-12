import {
  isClaimUtxoError,
  isCreateUtxoError,
  isEncryptedDepositError,
  isEncryptedWithdrawalError,
  isFetchUtxosError,
  isRegistrationError,
} from '@umbra-privacy/sdk/errors';

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
  | 'withdraw'
  | 'getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction'
  | 'getEncryptedBalanceToSelfClaimableUtxoCreatorFunction'
  | 'getPublicBalanceToReceiverClaimableUtxoCreatorFunction'
  | 'getPublicBalanceToSelfClaimableUtxoCreatorFunction'
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
  | 'INSUFFICIENT_FEE_SOL'
  | 'ZK_PROOF_ERROR'
  | 'USER_CANCELLED'
  | 'TX_TIMEOUT'
  | 'TX_VALIDATION_FAILED'
  | 'RPC_ERROR'
  | 'INDEXER_ERROR'
  | 'VERIFYING_KEY_NOT_INITIALIZED'
  | 'STALE_MERKLE_PROOF'
  | 'SIGNING_FAILED'
  | 'PROTOCOL_INSTRUCTION_MISMATCH'
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

/**
 * The user-facing message for `INSUFFICIENT_FEE_SOL`. Exported so the
 * `MoveFlow` pre-flight can reuse it verbatim — same wording whether the
 * failure surfaces from a simulation log or from the local balance check.
 */
export const INSUFFICIENT_FEE_SOL_MESSAGE =
  "Your wallet doesn't have enough SOL to pay network fees. Send a small amount of SOL (around 0.01) to your wallet, then try again.";

const MSG: Record<StealthErrorCode, string> = {
  REGISTRATION_REJECTED: 'Registration cancelled.',
  REGISTRATION_PROOF_FAILED: 'Failed to generate proof. Please try again.',
  USER_NOT_REGISTERED:
    'Your wallet is not registered yet. Try again in a few seconds.',
  RECEIVER_NOT_REGISTERED:
    'Recipient is not a Stealf user yet. Ask them to set up their wallet first.',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction.',
  INSUFFICIENT_FEE_SOL: INSUFFICIENT_FEE_SOL_MESSAGE,
  ZK_PROOF_ERROR: 'Failed to generate the privacy proof. Please try again.',
  USER_CANCELLED: 'Transaction cancelled.',
  TX_TIMEOUT:
    'Confirmation timed out. The transaction may still have landed — please check your balance before retrying.',
  TX_VALIDATION_FAILED: 'Transaction pre-flight failed. Please retry.',
  RPC_ERROR: 'Network error. Please check your connection and try again.',
  INDEXER_ERROR: 'Could not reach the network. Please check your connection.',
  VERIFYING_KEY_NOT_INITIALIZED:
    'Umbra Privacy unavailable on this network. Please contact support.',
  STALE_MERKLE_PROOF: 'This claim is out of date. Please refresh and try again.',
  SIGNING_FAILED: 'Signing failed. Please try again.',
  PROTOCOL_INSTRUCTION_MISMATCH:
    'Umbra Privacy unavailable on this network. Please contact support.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

function rawMessageOf(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string };
  return e?.cause?.message || e?.message || 'Operation failed';
}

function logsOf(err: unknown): string[] {
  const e = err as { cause?: { context?: { logs?: string[] } } };
  return e?.cause?.context?.logs ?? [];
}

function classifyInsufficient(
  logs: string[],
  rawMessage: string,
): 'fee' | 'balance' | null {
  if (logs.some((l) => /transfer:\s*insufficient lamports/i.test(l))) {
    return 'fee';
  }
  if (
    /insufficient/i.test(rawMessage) ||
    logs.some((l) => /insufficient (funds|lamports)/i.test(l))
  ) {
    return 'balance';
  }
  return null;
}

function isProtocolInstructionMismatch(logs: string[]): boolean {
  return logs.some(
    (l) =>
      /InstructionFallbackNotFound/i.test(l) ||
      /Error Number:\s*101\b/.test(l) ||
      /custom program error:\s*0x65\b/i.test(l),
  );
}

function isVerifyingKeyNotInitialized(logs: string[]): boolean {
  return logs.some(
    (l) =>
      /zero_knowledge_verifying_key/i.test(l) ||
      (/AccountNotInitialized/i.test(l) &&
        /verifying_key|verifyingKey/i.test(l)) ||
      /Error Number:\s*3012\b/.test(l) ||
      /custom program error:\s*0xbc4\b/i.test(l),
  );
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

function buildFromTxSend(
  err: unknown,
  op: StealthOp,
  stage?: string,
): StealthError {
  const logs = logsOf(err);
  if (isVerifyingKeyNotInitialized(logs)) {
    return build(err, op, 'VERIFYING_KEY_NOT_INITIALIZED', stage);
  }
  if (isProtocolInstructionMismatch(logs)) {
    return build(err, op, 'PROTOCOL_INSTRUCTION_MISMATCH', stage);
  }
  const cls = classifyInsufficient(logs, rawMessageOf(err));
  if (cls === 'fee') return build(err, op, 'INSUFFICIENT_FEE_SOL', stage);
  if (cls === 'balance') return build(err, op, 'INSUFFICIENT_BALANCE', stage);
  return build(err, op, 'TX_TIMEOUT', stage);
}

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
        return buildFromTxSend(err, op, err.stage);
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
        return build(err, op, 'USER_CANCELLED', err.stage);
      case 'transaction-send':
        return buildFromTxSend(err, op, err.stage);
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
        return buildFromTxSend(err, op, err.stage);
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
        return buildFromTxSend(err, op, err.stage);
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
        return buildFromTxSend(err, op, err.stage);
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
  const simulationLogs = logsOf(err);

  if (/receiver is not registered/i.test(rawMessage)) {
    return build(err, op, 'RECEIVER_NOT_REGISTERED');
  }
  if (/user is not registered|account.*not.*initialised|not registered/i.test(rawMessage)) {
    return build(err, op, 'USER_NOT_REGISTERED');
  }
  if (isVerifyingKeyNotInitialized(simulationLogs)) {
    return build(err, op, 'VERIFYING_KEY_NOT_INITIALIZED');
  }
  if (isProtocolInstructionMismatch(simulationLogs)) {
    return build(err, op, 'PROTOCOL_INSTRUCTION_MISMATCH');
  }
  const cls = classifyInsufficient(simulationLogs, rawMessage);
  if (cls === 'fee') return build(err, op, 'INSUFFICIENT_FEE_SOL');
  if (cls === 'balance') return build(err, op, 'INSUFFICIENT_BALANCE');
  if (/rpc|network|fetch|timeout/i.test(rawMessage)) {
    return build(err, op, 'RPC_ERROR');
  }

  return build(err, op, 'UNKNOWN');
}
