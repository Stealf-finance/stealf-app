import { useCallback, useState } from 'react';
import type { Address } from '@solana/kit';
import * as Sentry from '@sentry/react-native';

import {
  parseStealthError,
  StealthError,
  type StealthOp,
} from '@/src/features/umbra/lib/errors';
import {
  clearClients,
  getActiveClient,
  type UmbraClient,
} from '@/src/services/umbra/client';
import {
  clearRegistration,
  ensureRegistered,
  ensureRegisteredFor,
} from '@/src/services/umbra/registration';
import { clearBurntUtxos } from '@/src/services/umbra/burntUtxos';
import { clearClaimScanner } from '@/src/services/umbra/queries/scanNotes';

import { deposit } from '@/src/services/umbra/operations/deposit';
import { withdraw } from '@/src/services/umbra/operations/withdraw';
import {
  claimReceived,
  claimSelfToPublic,
} from '@/src/services/umbra/operations/burnNotes';
import {
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@/src/services/umbra/operations/transfer';

export {
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
};

export { StealthError };
export type { StealthErrorCode } from '@/src/features/umbra/lib/errors';
export type { UmbraClient };

/** Reset every Umbra-related cache. Called on logout / account deletion. */
export function clearUmbraState(): void {
  clearClients();
  clearRegistration();
  clearBurntUtxos();
  clearClaimScanner();
}

export function useUmbra() {
  // TODO(refactor): migrate `wrap()` to `useMutation` per op so consumers can
  // read per-op loading + error state directly. Currently `loading` is the only
  // surviving useUmbra-level state — `currentOp` and `error` were dropped after
  // verifying zero external readers (commit 4 of the Big Review polish sprint).
  const [loading, setLoading] = useState(false);

  const wrap = useCallback(
    async <T>(op: StealthOp, fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      try {
        return await fn();
      } catch (err: any) {
        const stealthErr = parseStealthError(err, op);
        if (__DEV__) {
          console.error(
            `[Stealth] ${op} failed (${stealthErr.code}):`,
            stealthErr.message,
          );
          console.error(
            `[Stealth] raw cause:`,
            err?.cause?.message || err?.cause,
          );
          console.error(`[Stealth] stage:`, stealthErr.stage);
          if (err?.cause?.context?.logs?.length) {
            console.error(
              `[Stealth] simulation logs:`,
              err.cause.context.logs,
            );
          }
        }
        // Surface stealth-flow failures to Sentry even in prod. Without
        // this the user-facing "Confirmation timed out" / "Insufficient SOL"
        // messages give us nothing to debug from in TestFlight. The raw
        // SDK cause + sim logs (when present) are the most useful payload.
        const simLogs: string[] | undefined =
          Array.isArray(err?.cause?.context?.logs) && err.cause.context.logs.length
            ? err.cause.context.logs.slice(0, 12)
            : undefined;
        Sentry.captureException(stealthErr, {
          tags: {
            'stealth.op': op,
            'stealth.code': stealthErr.code,
            'stealth.stage': stealthErr.stage ?? 'unknown',
          },
          extra: {
            userMessage: stealthErr.userMessage,
            rawCause: err?.cause?.message ?? err?.message ?? null,
            simLogs,
          },
        });
        throw stealthErr;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getClient = useCallback(() => getActiveClient(), []);

  return {
    loading,
    wrap,

    getClient,
    ensureRegistered,
    ensureRegisteredFor,

    register: useCallback(
      () => wrap('register', () => ensureRegistered()),
      [wrap],
    ),

    deposit: useCallback(
      (mint: Address, amount: bigint) =>
        wrap('deposit', () => deposit(mint, amount)),
      [wrap],
    ),

    withdraw: useCallback(
      (mint: Address, amount: bigint) =>
        wrap('withdraw', () => withdraw(mint, amount)),
      [wrap],
    ),

    sendEncrypted: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap(
          'getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction',
          async () => {
            const client = await getActiveClient();
            const create =
              getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction({
                client,
              });
            return create({ destinationAddress, mint, amount });
          },
        ),
      [wrap],
    ),

    claimReceived: useCallback(
      (utxos: any[]) => wrap('claimReceived', () => claimReceived(utxos)),
      [wrap],
    ),

    claimSelfToPublic: useCallback(
      (utxos: any[]) =>
        wrap('claimSelfToPublic', () => claimSelfToPublic(utxos)),
      [wrap],
    ),
  };
}
