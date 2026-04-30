import { useState } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export interface ExportResult {
  ok: boolean;
  mnemonic?: string;
  error?: string;
}

/**
 * Exports the recovery phrase of the wallet that contains the user's bank
 * address. Mirrors the front-stealf `exportWalletByAddress` flow: Turnkey
 * stores the seed at the wallet level, so we resolve it from the active
 * cash wallet account before calling exportWallet.
 */
export function useExportBankWallet() {
  const { exportWallet, wallets } = useTurnkey();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const run = async (): Promise<ExportResult> => {
    setLoading(true);
    try {
      const bankAddress = user?.bankWallet;
      if (!bankAddress) {
        return { ok: false, error: 'Bank wallet not found.' };
      }
      if (!wallets || wallets.length === 0) {
        return { ok: false, error: 'No wallet available.' };
      }

      const owning = wallets.find((w) =>
        w.accounts?.some((a) => a.address === bankAddress),
      );
      if (!owning?.walletId) {
        return { ok: false, error: 'No wallet found for the bank address.' };
      }

      const mnemonic = await exportWallet({ walletId: owning.walletId });
      if (!mnemonic) {
        return { ok: false, error: 'Failed to retrieve recovery phrase.' };
      }
      return { ok: true, mnemonic };
    } catch (err: unknown) {
      if (__DEV__) console.error('[useExportBankWallet] failed:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to export wallet.';
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { exportBankWallet: run, loading };
}
