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
} from '@/src/services/umbra/client';
import {
  clearRegistration,
  ensureRegistered,
} from '@/src/features/stealth/lib/registration';
import { clearBurntUtxos } from '@/src/features/stealth/lib/burntUtxos';
import { umbraClearSeed } from '@/src/services/umbra/seed';

import {
  deposit,
  depositFromBank,
} from '@/src/services/umbra/operations/deposit';
import { withdraw } from '@/src/services/umbra/operations/withdraw';
import {
  sendPrivate,
  selfShield,
  selfShieldFromPublicStealth,
  depositFromBankToReceiver,
  transferFromEncryptedBalanceToReceiver,
  transferFromPublicStealthToReceiver,
} from '@/src/services/umbra/operations/transfer';
import {
  claimReceived,
  claimSelfToPublic,
} from '@/src/services/umbra/operations/claim';

export { StealthError };
export type { StealthErrorCode } from '@/src/features/stealth/lib/errors';

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

  return {
    loading,
    currentOp,
    error,

    register: useCallback(
      () => wrap('register', () => ensureRegistered()),
      [wrap],
    ),

    deposit: useCallback(
      (mint: Address, amount: bigint) =>
        wrap('deposit', () => deposit(mint, amount)),
      [wrap],
    ),

    /**
     * Bank → Stealth deposit (single tx, signed by bank wallet via Turnkey).
     * Throws if Turnkey wallets aren't loaded yet.
     */
    depositFromBank: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap('depositFromBank', async () => {
          if (
            !bankWalletAccount ||
            !turnkeySignTransaction ||
            !turnkeySignMessage
          ) {
            throw new Error('Bank wallet not ready');
          }
          return depositFromBank({
            walletAccount: bankWalletAccount as any,
            signTransaction: turnkeySignTransaction as any,
            signMessage: turnkeySignMessage as any,
            destinationAddress,
            mint,
            amount,
          });
        }),
      [wrap, bankWalletAccount, turnkeySignTransaction, turnkeySignMessage],
    ),

    withdraw: useCallback(
      (mint: Address, amount: bigint) =>
        wrap('withdraw', () => withdraw(mint, amount)),
      [wrap],
    ),

    sendPrivate: useCallback(
      (recipient: Address, mint: Address, amount: bigint) =>
        wrap('sendPrivate', () => sendPrivate(recipient, mint, amount)),
      [wrap],
    ),

    selfShield: useCallback(
      (mint: Address, amount: bigint, destinationAddress?: Address) =>
        wrap('selfShield', () => selfShield(mint, amount, destinationAddress)),
      [wrap],
    ),

    /**
     * Self-claimable UTXO from the stealth wallet's PUBLIC balance, signed
     * by the local stealth key. Used for stealth → bank.
     */
    selfShieldFromPublicStealth: useCallback(
      (mint: Address, amount: bigint, destinationAddress?: Address) =>
        wrap('selfShieldFromPublicStealth', () =>
          selfShieldFromPublicStealth(mint, amount, destinationAddress),
        ),
      [wrap],
    ),

    /**
     * Receiver-claimable UTXO from the BANK wallet's public balance, signed
     * by Turnkey. Used for bank → shielded — the stealth wallet claims into
     * its encrypted balance using its registered userCommitment.
     */
    depositFromBankToReceiver: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap('depositFromBankToReceiver', async () => {
          if (
            !bankWalletAccount ||
            !turnkeySignTransaction ||
            !turnkeySignMessage
          ) {
            throw new Error('Bank wallet not ready');
          }
          return depositFromBankToReceiver({
            walletAccount: bankWalletAccount as any,
            signTransaction: turnkeySignTransaction as any,
            signMessage: turnkeySignMessage as any,
            destinationAddress,
            mint,
            amount,
          });
        }),
      [wrap, bankWalletAccount, turnkeySignTransaction, turnkeySignMessage],
    ),

    /**
     * Receiver-claimable UTXO from the stealth wallet's ENCRYPTED balance,
     * locked to a destination (typically the bank wallet). Stealth signs the
     * tx; the destination later claims into its own encrypted balance.
     * Symmetric to `depositFromBankToReceiver`. Turnkey args are needed only
     * to register the bank's `userCommitment` PDA on first use.
     */
    transferFromEncryptedBalanceToReceiver: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap('transferFromEncryptedBalanceToReceiver', async () => {
          if (
            !bankWalletAccount ||
            !turnkeySignTransaction ||
            !turnkeySignMessage
          ) {
            throw new Error('Bank wallet not ready');
          }
          return transferFromEncryptedBalanceToReceiver({
            walletAccount: bankWalletAccount as any,
            signTransaction: turnkeySignTransaction as any,
            signMessage: turnkeySignMessage as any,
            destinationAddress,
            mint,
            amount,
          });
        }),
      [wrap, bankWalletAccount, turnkeySignTransaction, turnkeySignMessage],
    ),

    /**
     * Receiver-claimable UTXO from the stealth wallet's PUBLIC ATA, locked
     * to a destination (typically the bank wallet). Stealth signs locally;
     * Turnkey args register the bank's userCommitment if not yet registered.
     */
    transferFromPublicStealthToReceiver: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap('transferFromPublicStealthToReceiver', async () => {
          if (
            !bankWalletAccount ||
            !turnkeySignTransaction ||
            !turnkeySignMessage
          ) {
            throw new Error('Bank wallet not ready');
          }
          return transferFromPublicStealthToReceiver({
            walletAccount: bankWalletAccount as any,
            signTransaction: turnkeySignTransaction as any,
            signMessage: turnkeySignMessage as any,
            destinationAddress,
            mint,
            amount,
          });
        }),
      [wrap, bankWalletAccount, turnkeySignTransaction, turnkeySignMessage],
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
