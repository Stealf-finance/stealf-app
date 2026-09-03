/**
 * Private swap orchestration hook (3-layer wrap of `runPrivateSwap`).
 *
 * Mirrors `useSwapExecute`'s shape so the swap screen can pick the runner by a
 * Public/Private toggle. `enabled` reflects `PRIVATE_SWAP_ENABLED` — the UI only
 * surfaces the toggle when the flow has been validated + turned on (see
 * private-swap.md); until then this stays inert.
 */
import { useCallback, useState } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { runPrivateSwap, PRIVATE_SWAP_ENABLED } from '../lib/privateSwap';
import { toBaseUnits } from '../lib/swapMath';
import type { SwapToken } from '../lib/tokens';

export function usePrivateSwap() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);

  const swap = useCallback(
    async (payToken: SwapToken, receiveToken: SwapToken, payAmount: number) => {
      setLoading(true);
      try {
        const token = session?.sessionToken;
        if (!token) throw new Error('Not authenticated');
        const stealthWallet = user?.stealfWallet;
        if (!stealthWallet) throw new Error('Wallet not set up');

        return await runPrivateSwap({
          sessionToken: token,
          stealthWallet,
          inputMint: payToken.mint,
          outputMint: receiveToken.mint,
          amountBaseUnits: BigInt(toBaseUnits(payAmount, payToken.decimals)),
        });
      } finally {
        setLoading(false);
      }
    },
    [session, user],
  );

  return { swap, loading, enabled: PRIVATE_SWAP_ENABLED };
}
