/**
 * xStock trade orchestration: build (backend, bank wallet) → sign (bank wallet
 * via Turnkey, SIGN-ONLY) → execute (backend forwards to Jupiter, which
 * broadcasts + lands it). BUY spends USDC; SELL sends raw Token-2022 base units.
 *
 * Bank-signed: the backend `resolveSigner` authorizes ONLY the caller's bank
 * wallet (a stealth signer 403s), so xStock trades sign with the bank wallet's
 * Turnkey key. Turnkey `signTransaction` returns the signed tx (hex) without
 * broadcasting — the backend/Jupiter handles the broadcast. Invalidates the
 * xStock + wallet balances on success.
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildBuy,
  buildSell,
  executeTrade,
  type BuildResult,
  type ExecuteResult,
} from '../api/trade';

const b64ToHex = (b64: string) => Buffer.from(b64, 'base64').toString('hex');
const hexToB64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');

export function useXstockTrade() {
  const { user, session } = useAuth();
  const { signTransaction, wallets, refreshWallets } = useTurnkey();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (
      build: (token: string, signer: string) => Promise<BuildResult>,
    ): Promise<ExecuteResult> => {
      setLoading(true);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const signer = user?.bankWallet;
        if (!signer) throw new Error('Bank wallet not available');

        const built = await build(token, signer);

        // Resolve the exact Solana bank account by address — Turnkey's reactive
        // `wallets` can be empty right after mount, so refresh once first, and
        // never fall back to accounts[0] (the list can be mixed Solana+EVM).
        let accounts = wallets?.[0]?.accounts;
        if (!accounts?.length) {
          const refreshed = await refreshWallets();
          accounts = refreshed?.[0]?.accounts;
        }
        const walletAccount = accounts?.find((a) => a.address === signer);
        if (!walletAccount) {
          throw new Error(`Turnkey wallet account not found for ${signer}`);
        }

        // Sign-only (no broadcast) — the backend forwards the signed tx to
        // Jupiter, which lands it.
        const signedHex = await signTransaction({
          walletAccount,
          unsignedTransaction: b64ToHex(built.unsignedTransactionBase64),
          transactionType: 'TRANSACTION_TYPE_SOLANA',
        });
        const res = await executeTrade(token, {
          requestId: built.requestId,
          signedTransaction: hexToB64(signedHex),
        });

        void queryClient.invalidateQueries({ queryKey: ['xstocks', 'balance'] });
        void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        return res;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signTransaction, wallets, refreshWallets, queryClient],
  );

  const buy = useCallback(
    (symbol: string, usdcBaseUnits: number, slippageBps?: number) =>
      run((token, signer) => buildBuy(token, { symbol, usdcBaseUnits, signer, slippageBps })),
    [run],
  );

  const sell = useCallback(
    (symbol: string, xstockRawBaseUnits: number, slippageBps?: number) =>
      run((token, signer) => buildSell(token, { symbol, xstockRawBaseUnits, signer, slippageBps })),
    [run],
  );

  return { buy, sell, loading };
}
