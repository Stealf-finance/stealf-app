/**
 * Execute a swap: fresh `/order` → sign (bank wallet via Turnkey, SIGN-ONLY) →
 * `/execute`. Ordering fresh at confirm time avoids "order expired" from a
 * stale quote. Invalidates the wallet balance on success.
 */
import { useCallback, useState } from 'react';
import { Buffer } from 'buffer';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useTurnkeySigning } from '@/src/features/bank/hooks/useTurnkeySigning';
import { buildSwapOrder, executeSwap, type ExecuteResponse } from '../api/swap';
import { toBaseUnits } from '../lib/swapMath';
import type { SwapToken } from '../lib/tokens';

const b64ToHex = (b64: string) => Buffer.from(b64, 'base64').toString('hex');
const hexToB64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');

export function useSwapExecute() {
  const { user, session } = useAuth();
  const { signHex } = useTurnkeySigning();
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
        const taker = user?.bankWallet;
        if (!taker) throw new Error('Wallet not set up');

        const order = await buildSwapOrder(token, {
          inputMint: payToken.mint,
          outputMint: receiveToken.mint,
          amount: toBaseUnits(payAmount, payToken.decimals),
          taker,
        });
        // Sign-only — the backend forwards the signed tx to Jupiter, which
        // broadcasts and lands it.
        const signedHex = await signHex(b64ToHex(order.transaction!));
        const res = await executeSwap(token, {
          requestId: order.requestId,
          signedTransaction: hexToB64(signedHex),
        });

        void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        return res;
      } finally {
        setLoading(false);
      }
    },
    [session, user, signHex, queryClient],
  );

  return { swap, loading };
}
