/**
 * useJitoStake — stake / unstake JitoSOL (liquid, non-private) via Jupiter.
 *
 * The backend (`/api/yield/jito/build-{stake,unstake}`) returns an UNSIGNED
 * transaction. We SIGN it with Turnkey using the sign-ONLY `signTransaction`
 * (no broadcast), then POST the signed tx to `/execute`, which lets Jupiter
 * land it. Bank-wallet only (Turnkey signing) — signing paths don't mix.
 *
 * Modeled on useXstocksTrade (same Jupiter build -> sign -> execute shape).
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildJitoStake,
  buildJitoUnstake,
  executeJitoSwap,
  solToLamports,
} from '../api/jitoStake';

function base64ToHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}
function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

export interface JitoStakeResult {
  signature: string;
}

export interface JitoStakeOpts {
  slippageBps?: number;
}

export function useJitoStake() {
  const { user, session } = useAuth();
  const { signTransaction, wallets, refreshWallets } = useTurnkey();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sign-only via Turnkey; returns the signed tx as base64. */
  const signBank = useCallback(
    async (unsignedTransactionBase64: string, signerAddress: string) => {
      // The reactive `wallets` can be empty right after mount (Turnkey session
      // hydrates async) — refresh once before resolving.
      let accounts = wallets?.[0]?.accounts;
      if (!accounts?.length) {
        const refreshed = await refreshWallets();
        accounts = refreshed?.[0]?.accounts;
      }
      // Match the EXACT Solana bank account by address — never fall back to
      // accounts[0]. The borrow flow can add an EVM account to the same Turnkey
      // wallet, so accounts is a mixed list; a fallback could sign with the
      // wrong key.
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

  /** Stake `amountSol` of native SOL → JitoSOL, into the bank wallet. */
  const stake = useCallback(
    async (
      amountSol: number,
      opts: JitoStakeOpts = {},
    ): Promise<JitoStakeResult> => {
      setLoading(true);
      setError(null);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const wallet = user?.bankWallet;
        if (!wallet) throw new Error('Bank wallet not available');

        const built = await buildJitoStake(token, {
          solLamports: solToLamports(amountSol),
          slippageBps: opts.slippageBps,
          signer: wallet,
        });

        const signedTransaction = await signBank(
          built.unsignedTransactionBase64,
          wallet,
        );

        const { signature } = await executeJitoSwap(token, {
          requestId: built.requestId,
          signedTransaction,
        });

        return { signature };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stake failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signBank],
  );

  /**
   * Unstake `jitoSolBaseUnits` (RAW, from the on-chain balance) → SOL. The app
   * never invents the amount — callers pass a value derived from the on-chain
   * JitoSOL balance (e.g. a percentage of the raw holding).
   */
  const unstake = useCallback(
    async (
      jitoSolBaseUnits: number,
      opts: JitoStakeOpts = {},
    ): Promise<JitoStakeResult> => {
      setLoading(true);
      setError(null);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const wallet = user?.bankWallet;
        if (!wallet) throw new Error('Bank wallet not available');
        if (!Number.isInteger(jitoSolBaseUnits) || jitoSolBaseUnits <= 0) {
          throw new Error('No JitoSOL to unstake');
        }

        const built = await buildJitoUnstake(token, {
          jitoSolBaseUnits,
          slippageBps: opts.slippageBps,
          signer: wallet,
        });

        const signedTransaction = await signBank(
          built.unsignedTransactionBase64,
          wallet,
        );

        const { signature } = await executeJitoSwap(token, {
          requestId: built.requestId,
          signedTransaction,
        });

        return { signature };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unstake failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signBank],
  );

  return { stake, unstake, loading, error };
}
