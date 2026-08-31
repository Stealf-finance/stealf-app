import { useCallback } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

/**
 * Turnkey signing for the bank wallet, bound to its Solana account and reduced
 * to one hex-in / hex-out call so services can take it as a plain function.
 *
 * SIGN-ONLY: Turnkey returns the signed transaction without broadcasting it —
 * the caller submits and confirms. Use `signAndSendTransaction` instead when
 * Turnkey should broadcast too.
 */
export function useTurnkeySigning() {
  const { user } = useAuth();
  const { signTransaction, wallets, refreshWallets } = useTurnkey();
  const address = user?.bankWallet ?? null;

  const signHex = useCallback(
    async (unsignedHex: string): Promise<string> => {
      if (!address) throw new Error('Virtual bank account not ready');

      // Turnkey's reactive `wallets` can be empty right after mount, so refresh
      // once before giving up — and always match on address rather than taking
      // accounts[0], which can be a non-Solana account.
      let accounts = wallets?.[0]?.accounts;
      if (!accounts?.length) {
        const refreshed = await refreshWallets();
        accounts = refreshed?.[0]?.accounts;
      }
      const walletAccount = accounts?.find((a) => a.address === address);
      if (!walletAccount) {
        throw new Error(`Turnkey wallet account not found for ${address}`);
      }

      return signTransaction({
        walletAccount,
        unsignedTransaction: unsignedHex,
        transactionType: 'TRANSACTION_TYPE_SOLANA',
      });
    },
    [address, signTransaction, wallets, refreshWallets],
  );

  return { signHex, address };
}
