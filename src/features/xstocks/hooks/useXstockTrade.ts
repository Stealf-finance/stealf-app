/**
 * xStock trade orchestration: build (backend) → sign (stealth ED25519) →
 * execute (backend broadcasts via Jupiter). BUY spends USDC; SELL sends raw
 * Token-2022 base units. Invalidates the xStock + wallet balances on success.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  buildBuy,
  buildSell,
  executeTrade,
  type BuildResult,
  type ExecuteResult,
} from '../api/trade';
import { signSwapTransaction } from '../lib/signSwap';

export function useXstockTrade() {
  const { user, session } = useAuth();
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
        const signer = user?.stealfWallet;
        if (!signer) throw new Error('Wallet not set up');

        const built = await build(token, signer);
        const signedTransaction = await signSwapTransaction(built.unsignedTransactionBase64);
        const res = await executeTrade(token, {
          requestId: built.requestId,
          signedTransaction,
        });

        void queryClient.invalidateQueries({ queryKey: ['xstocks', 'balance'] });
        void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        return res;
      } finally {
        setLoading(false);
      }
    },
    [session, user, queryClient],
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
