/**
 * Live swap quote: debounced `/order` call → estimated "You receive" amount
 * (plus the order for reference). Runs only when the pay amount settles and the
 * two tokens differ. The Review step re-orders fresh before signing, so this is
 * display-only.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { buildSwapOrder, type OrderResponse } from '../api/swap';
import { fromBaseUnits, toBaseUnits } from '../lib/swapMath';
import type { SwapToken } from '../lib/tokens';
import { useDebouncedValue } from './useDebouncedValue';

export function useSwapQuote(
  payToken: SwapToken,
  receiveToken: SwapToken,
  payAmount: number,
) {
  const { user, session } = useAuth();
  const token = session?.sessionToken ?? null;
  const taker = user?.bankWallet ?? null;
  const debounced = useDebouncedValue(payAmount, 400);

  const enabled =
    !!token && !!taker && debounced > 0 && payToken.mint !== receiveToken.mint;

  const q = useQuery<OrderResponse>({
    queryKey: ['swap', 'quote', payToken.mint, receiveToken.mint, debounced],
    queryFn: () =>
      buildSwapOrder(token!, {
        inputMint: payToken.mint,
        outputMint: receiveToken.mint,
        amount: toBaseUnits(debounced, payToken.decimals),
        taker: taker!,
      }),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });

  const receiveAmount = q.data?.outAmount
    ? fromBaseUnits(q.data.outAmount, receiveToken.decimals)
    : 0;

  return {
    receiveAmount,
    order: q.data,
    loading: enabled && q.isFetching,
    error: q.isError,
  };
}
