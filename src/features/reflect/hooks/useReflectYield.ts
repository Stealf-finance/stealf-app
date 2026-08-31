/**
 * useReflectYield — buy (mint) / sell (burn) STLF via Reflect.
 *
 * Bank-wallet flow: the backend (`/api/yield/usdc/build-{mint,burn}`) returns an
 * unsigned tx (base64) + the mainnet `rpcUrl` to broadcast on (STLF is mainnet;
 * the app bundle is devnet). Turnkey signs + broadcasts, then we POLL the
 * signature to confirmation on that rpcUrl BEFORE recording the position via
 * `/confirm` — so a dropped/reverted tx never leaves a phantom position.
 *
 * Signing is Turnkey (bank wallet) only — hard rule #3. Stealth/umbra signing is
 * intentionally out of scope here (the backend resolveSigner accepts the bank
 * wallet, and routing STLF through the backend must not leak the stealth wallet).
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildReflectBurn,
  buildReflectMint,
  confirmReflectTx,
  usdcToBaseUnits,
} from '../api/reflect';
import { waitForSignatureConfirmation } from '../lib/confirmTx';

function base64ToHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}

export interface ReflectExecResult {
  signature: string;
  wallet: string;
  expectedReceivedBaseUnits: number;
  minimumReceivedBaseUnits: number;
  rate: number;
  /** Whether the tx was seen confirmed on-chain (position recorded). */
  confirmed: boolean;
}

export interface ReflectYieldOpts {
  slippageBps?: number;
}

export function useReflectYield() {
  const { user, session } = useAuth();
  const { signAndSendTransaction, wallets, refreshWallets } = useTurnkey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Turnkey signs the backend-built tx against the user's bank wallet and
   * broadcasts on the backend-supplied mainnet rpcUrl.
   */
  const signAndBroadcast = useCallback(
    async (
      unsignedTransactionBase64: string,
      signerAddress: string,
      rpcUrl: string,
    ): Promise<string> => {
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
        rpcUrl,
      });
    },
    [signAndSendTransaction, wallets, refreshWallets],
  );

  const exec = useCallback(
    async (
      operation: 'mint' | 'burn',
      amount: number,
      opts: ReflectYieldOpts,
    ): Promise<ReflectExecResult> => {
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
            ? await buildReflectMint(token, {
                amount: amountBaseUnits,
                slippageBps: opts.slippageBps,
              })
            : await buildReflectBurn(token, {
                amount: amountBaseUnits,
                slippageBps: opts.slippageBps,
              });

        const signature = await signAndBroadcast(
          built.unsignedTransactionBase64,
          built.signer,
          built.rpcUrl,
        );

        // Only record the position once the tx is confirmed on-chain.
        const confirmed = await waitForSignatureConfirmation(
          built.rpcUrl,
          signature,
        );

        if (confirmed) {
          try {
            await confirmReflectTx(token, {
              wallet,
              walletContext: 'bank',
              operation,
              txSignature: signature,
              usdcBaseUnits:
                operation === 'mint'
                  ? amountBaseUnits
                  : built.minimumReceivedBaseUnits,
              usdcPlusBaseUnits:
                operation === 'mint'
                  ? built.minimumReceivedBaseUnits
                  : amountBaseUnits,
              rate: built.rate,
            });
          } catch (err) {
            // Best-effort bookkeeping — the tx already landed; never fail here.
            if (__DEV__) console.warn('[reflect] confirm record failed:', err);
          }
        }

        return {
          signature,
          wallet,
          expectedReceivedBaseUnits: built.expectedReceivedBaseUnits,
          minimumReceivedBaseUnits: built.minimumReceivedBaseUnits,
          rate: built.rate,
          confirmed,
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
    [session, user, signAndBroadcast],
  );

  const buy = useCallback(
    (amountUsdc: number, opts: ReflectYieldOpts = {}) =>
      exec('mint', amountUsdc, opts),
    [exec],
  );

  const sell = useCallback(
    (amountStlf: number, opts: ReflectYieldOpts = {}) =>
      exec('burn', amountStlf, opts),
    [exec],
  );

  return { buy, sell, loading, error };
}
