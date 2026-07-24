/**
 * Execute a swap: fresh `/order` → sign (stealth ED25519) → `/execute`. Ordering
 * fresh at confirm time avoids "order expired" from a stale quote. Invalidates
 * the wallet balance on success.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { signSwapTransaction } from '@/src/services/wallet/signStealthTransaction';
import { buildSwapOrder, executeSwap, type ExecuteResponse } from '../api/swap';
import { toBaseUnits } from '../lib/swapMath';
import type { SwapToken } from '../lib/tokens';

export function useSwapExecute() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const swap = useCallback(
    async (
      payToken: SwapToken,
      receiveToken: SwapToken,
      payAmount: number,
    ): Promise<ExecuteResponse> => {
      setLoading(true);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const taker = user?.stealfWallet;
        if (!taker) throw new Error('Wallet not set up');

        const order = await buildSwapOrder(token, {
          inputMint: payToken.mint,
          outputMint: receiveToken.mint,
          amount: toBaseUnits(payAmount, payToken.decimals),
          taker,
        });
        const signedTransaction = await signSwapTransaction(order.transaction!);
        const res = await executeSwap(token, {
          requestId: order.requestId,
          signedTransaction,
        });

        void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        return res;
      } finally {
        setLoading(false);
      }
    },
    [session, user, queryClient],
  );

  return { swap, loading };
}
