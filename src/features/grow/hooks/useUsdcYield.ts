/**
 * useUsdcYield — mint / burn USDC+ via Reflect.
 *
 * Ported from front-stealf. The backend (`/api/yield/usdc/build-{mint,burn}`)
 * returns an unsigned transaction (base64); we sign + broadcast, then record
 * the position via `/confirm`.
 *
 * Signer contexts:
 *  - 'bank'    — signed via Turnkey (custodial), broadcast by Turnkey. Wired.
 *  - 'stealth' — local ED25519 signing of a pre-built tx. NOT yet wired in
 *                stealf-app (front-stealf only). Throws.
 *  - 'umbra'   — Umbra-derived signer. NOT wired here. Throws.
 *
 * Note: the Seeker / Mobile-Wallet-Adapter signing path from front-stealf is
 * intentionally dropped — stealf-app has no Seeker integration.
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildUsdcBurn,
  buildUsdcMint,
  confirmUsdcYieldTx,
  usdcToBaseUnits,
  type UsdcYieldWalletContext,
} from '../api/usdcYield';

function base64ToHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}

export interface UsdcYieldExecResult {
  signature: string;
  walletContext: UsdcYieldWalletContext;
  wallet: string;
  expectedReceivedBaseUnits: number;
  minimumReceivedBaseUnits: number;
  rate: number;
}

export interface UsdcYieldOpts {
  slippageBps?: number;
}

export function useUsdcYield(walletContext: UsdcYieldWalletContext = 'bank') {
  const { user, session } = useAuth();
  const { signAndSendTransaction, wallets, refreshWallets } = useTurnkey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Bank context: backend signs against the user's bank_wallet (signer omitted
   * in the build body), Turnkey signs + broadcasts the returned tx.
   */
  const signAndBroadcastBank = useCallback(
    async (
      unsignedTransactionBase64: string,
      signerAddress: string,
      rpcUrl: string,
    ) => {
      // Turnkey's reactive `wallets` can be empty right after mount — refresh
      // once before resolving the account (mirrors useEvmAddress).
      let accounts = wallets?.[0]?.accounts;
      if (!accounts?.length) {
        const refreshed = await refreshWallets();
        accounts = refreshed?.[0]?.accounts;
      }
      // Match the exact Solana bank account by address — never fall back to
      // accounts[0] (the wallet can hold a mixed Solana+EVM account list).
      const walletAccount = accounts?.find(
        (account) => account.address === signerAddress,
      );
      if (!walletAccount) {
        throw new Error(`Turnkey wallet account not found for ${signerAddress}`);
      }
      return signAndSendTransaction({
        walletAccount,
        unsignedTransaction: base64ToHex(unsignedTransactionBase64),
        transactionType: 'TRANSACTION_TYPE_SOLANA',
        // Reflect/STLF is mainnet; broadcast on the cluster the backend built
        // the tx for (its bundled EXPO_PUBLIC_SOLANA_RPC_URL is devnet).
        rpcUrl,
      });
    },
    [signAndSendTransaction, wallets, refreshWallets],
  );

  const exec = useCallback(
    async (
      operation: 'mint' | 'burn',
      amount: number,
      opts: UsdcYieldOpts,
    ): Promise<UsdcYieldExecResult> => {
      if (walletContext !== 'bank') {
        throw new Error(
          `walletContext "${walletContext}" is not wired in stealf-app yet (bank only)`,
        );
      }
      setLoading(true);
      setError(null);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const wallet = user?.bankWallet;
        if (!wallet) throw new Error('Bank wallet not available');

        const amountBaseUnits = usdcToBaseUnits(amount);
        const built =
          operation === 'mint'
            ? await buildUsdcMint(token, {
                amount: amountBaseUnits,
                slippageBps: opts.slippageBps,
              })
            : await buildUsdcBurn(token, {
                amount: amountBaseUnits,
                slippageBps: opts.slippageBps,
              });

        const signature = await signAndBroadcastBank(
          built.unsignedTransactionBase64,
          built.signer,
          built.rpcUrl,
        );

        // Record server-side (best-effort — never block the UI on this).
        try {
          await confirmUsdcYieldTx(token, {
            wallet,
            walletContext,
            operation,
            txSignature: signature,
            usdcBaseUnits:
              operation === 'mint' ? amountBaseUnits : built.minimumReceivedBaseUnits,
            usdcPlusBaseUnits:
              operation === 'mint' ? built.minimumReceivedBaseUnits : amountBaseUnits,
            rate: built.rate,
          });
        } catch (err) {
          if (__DEV__) console.warn('[useUsdcYield] confirm failed:', err);
        }

        return {
          signature,
          walletContext,
          wallet,
          expectedReceivedBaseUnits: built.expectedReceivedBaseUnits,
          minimumReceivedBaseUnits: built.minimumReceivedBaseUnits,
          rate: built.rate,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : `${operation} failed`;
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [walletContext, session, user, signAndBroadcastBank],
  );

  const mint = useCallback(
    (amountUsdc: number, opts: UsdcYieldOpts = {}) =>
      exec('mint', amountUsdc, opts),
    [exec],
  );

  const burn = useCallback(
    (amountUsdcPlus: number, opts: UsdcYieldOpts = {}) =>
      exec('burn', amountUsdcPlus, opts),
    [exec],
  );

  return { mint, burn, loading, error };
}
