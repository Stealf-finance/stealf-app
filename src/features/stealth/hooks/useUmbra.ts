import { useCallback, useState } from 'react';
import type { Address } from '@solana/kit';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';

import {
  parseStealthError,
  StealthError,
  type StealthOp,
} from '@/src/features/stealth/lib/errors';
import {
  clearStealthClient,
  clearBankClient,
  getStealthClient as sdkGetStealthClient,
  getBankClient as sdkGetBankClient,
  type UmbraClient,
} from '@/src/services/umbra/client';
import {
  clearRegistration,
  ensureRegistered,
  ensureRegisteredFor,
} from '@/src/features/stealth/lib/registration';
import { clearBurntUtxos } from '@/src/features/stealth/lib/burntUtxos';
import { umbraClearSeed } from '@/src/services/umbra/seed';

import { deposit } from '@/src/services/umbra/operations/deposit';
import { withdraw } from '@/src/services/umbra/operations/withdraw';
import { sendEncrypted } from '@/src/services/umbra/operations/sendEncrypted';
import {
  claimReceived,
  claimSelfToPublic,
} from '@/src/services/umbra/operations/claim';

export {
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@/src/services/umbra/operations/transfer';

export { StealthError };
export type { StealthErrorCode } from '@/src/features/stealth/lib/errors';
export type { UmbraClient };

/** Reset every stealth-related cache. Called on logout / wallet switch. */
export function clearStealthState(): void {
  clearStealthClient();
  clearBankClient();
  clearRegistration();
  clearBurntUtxos();
}

export { umbraClearSeed };

export function useUmbra() {
  const [loading, setLoading] = useState(false);
  const [currentOp, setCurrentOp] = useState<StealthOp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    signTransaction: turnkeySignTransaction,
    signMessage: turnkeySignMessage,
    wallets,
  } = useTurnkey();
  const bankWalletAccount = wallets?.[0]?.accounts?.[0] ?? null;

  const wrap = useCallback(
    async <T>(op: StealthOp, fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setCurrentOp(op);
      setError(null);
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
        setError(stealthErr.userMessage);
        throw stealthErr;
      } finally {
        setLoading(false);
        setCurrentOp(null);
      }
    },
    [],
  );

  const getStealthClient = useCallback(() => sdkGetStealthClient(), []);

  const getBankClient = useCallback(async () => {
    if (
      !bankWalletAccount ||
      !turnkeySignTransaction ||
      !turnkeySignMessage
    ) {
      throw new Error('Bank wallet not ready');
    }
    return sdkGetBankClient({
      walletAccount: bankWalletAccount as any,
      signTransaction: turnkeySignTransaction as any,
      signMessage: turnkeySignMessage as any,
    });
  }, [bankWalletAccount, turnkeySignTransaction, turnkeySignMessage]);

  return {
    loading,
    currentOp,
    error,
    wrap,

    getStealthClient,
    getBankClient,
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
          () => sendEncrypted(destinationAddress, mint, amount),
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
