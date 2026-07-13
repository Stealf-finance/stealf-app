/**
 * useXstocksTrade — buy / sell tokenized stocks via the Jupiter Ultra flow.
 *
 * The backend (`/api/xstocks/build-{buy,sell}`) returns an UNSIGNED transaction
 * (base64). We SIGN it with Turnkey using the sign-ONLY `signTransaction`
 * method (it does NOT broadcast), then POST the signed tx to `/execute`, which
 * lets Jupiter land it on-chain.
 *
 * Bank-wallet only (Turnkey signing). Signing paths don't mix — the bank wallet
 * goes through Turnkey, never a local key.
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildXstockBuy,
  buildXstockSell,
  executeXstockSwap,
  fetchXstockBalance,
  usdcToBaseUnits,
} from '../api/xstocks';

function base64ToHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}

function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

export interface XstockTradeResult {
  signature: string;
}

export interface XstockTradeOpts {
  slippageBps?: number;
}

/** Sell percentages the UI exposes (25% / 50% / 100% of holdings). */
export type SellPct = 0.25 | 0.5 | 1;

export function useXstocksTrade() {
  const { user, session } = useAuth();
  const { signTransaction, wallets, refreshWallets } = useTurnkey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign-only: Turnkey signs the pre-built tx and returns it as HEX. It does
   * NOT broadcast — we POST the re-encoded base64 to `/execute` next.
   */
  const signBank = useCallback(
    async (unsignedTransactionBase64: string, signerAddress: string) => {
      // The reactive `wallets` can be empty right after mount (Turnkey session
      // hydrates async) — refresh once before resolving. Mirrors useEvmAddress.
      let accounts = wallets?.[0]?.accounts;
      if (!accounts?.length) {
        const refreshed = await refreshWallets();
        accounts = refreshed?.[0]?.accounts;
      }
      // Match the EXACT Solana bank account by address — never fall back to
      // accounts[0]. The borrow flow adds an EVM (Ethereum) account to the same
      // Turnkey wallet, so accounts is a mixed Solana+EVM list with no
      // guaranteed order; a fallback could sign a Solana tx with the wrong key.
      const bankAccount = accounts?.find((a) => a.address === signerAddress);
      if (!bankAccount) {
        throw new Error(`Turnkey Solana account not found for ${signerAddress}`);
      }
      const signedHex: string = await signTransaction({
        walletAccount: bankAccount,
        unsignedTransaction: base64ToHex(unsignedTransactionBase64),
        transactionType: 'TRANSACTION_TYPE_SOLANA',
      });
      return hexToBase64(signedHex);
    },
    [signTransaction, wallets, refreshWallets],
  );

  const buy = useCallback(
    async (
      symbol: string,
      amountUsd: number,
      opts: XstockTradeOpts = {},
    ): Promise<XstockTradeResult> => {
      setLoading(true);
      setError(null);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const wallet = user?.bankWallet;
        if (!wallet) throw new Error('Bank wallet not available');

        const built = await buildXstockBuy(token, {
          symbol,
          usdcBaseUnits: usdcToBaseUnits(amountUsd),
          slippageBps: opts.slippageBps,
          signer: wallet,
        });

        const signedTransaction = await signBank(
          built.unsignedTransactionBase64,
          wallet,
        );

        const { signature } = await executeXstockSwap(token, {
          requestId: built.requestId,
          signedTransaction,
        });

        return { signature };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Buy failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signBank],
  );

  const sell = useCallback(
    async (
      symbol: string,
      pct: SellPct,
      opts: XstockTradeOpts = {},
    ): Promise<XstockTradeResult> => {
      setLoading(true);
      setError(null);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const wallet = user?.bankWallet;
        if (!wallet) throw new Error('Bank wallet not available');

        // Sell a PERCENTAGE of the on-chain RAW balance — the app never
        // computes xStock (8-decimal) amounts itself.
        const balance = await fetchXstockBalance(wallet, symbol);
        const rawBaseUnits = balance?.rawBaseUnits ?? 0;
        if (rawBaseUnits <= 0) throw new Error('No holdings to sell');
        const xstockRawBaseUnits = Math.floor(rawBaseUnits * pct);
        if (xstockRawBaseUnits <= 0) throw new Error('Amount too small');

        const built = await buildXstockSell(token, {
          symbol,
          xstockRawBaseUnits,
          slippageBps: opts.slippageBps,
          signer: wallet,
        });

        const signedTransaction = await signBank(
          built.unsignedTransactionBase64,
          wallet,
        );

        const { signature } = await executeXstockSwap(token, {
          requestId: built.requestId,
          signedTransaction,
        });

        return { signature };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sell failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signBank],
  );

  return { buy, sell, loading, error };
}
