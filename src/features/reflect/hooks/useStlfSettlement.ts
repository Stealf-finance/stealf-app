/**
 * Watches a submitted STLF trade until the tokens actually move in the bank
 * wallet. The Helius webhook pushes `balance:updated` on the wallet room once
 * the tx is indexed on-chain, so there is nothing to poll — see
 * `lib/stlfSettlement.ts` for how a trade is told apart from unrelated traffic.
 */
import { useEffect, useState } from 'react';
import { socketService } from '@/src/services/real-time/socket';
import { BalanceUpdateEventSchema } from '@/src/features/bank/api/subscriptions';
import { hasStlfSettled } from '../lib/stlfSettlement';

/** Past this, the webhook is late enough that we stop making the user wait. */
export const SETTLEMENT_TIMEOUT_MS = 30_000;

export type StlfSettlementStatus = 'idle' | 'pending' | 'settled' | 'slow';

type Params = {
  wallet: string | null | undefined;
  stlfMint: string | undefined;
  /** STLF holding, in base units, as it stood when the trade was submitted. */
  baselineBaseUnits: number | null;
  enabled: boolean;
  timeoutMs?: number;
};

export function useStlfSettlement({
  wallet,
  stlfMint,
  baselineBaseUnits,
  enabled,
  timeoutMs = SETTLEMENT_TIMEOUT_MS,
}: Params): StlfSettlementStatus {
  const [status, setStatus] = useState<StlfSettlementStatus>('idle');

  useEffect(() => {
    if (!enabled || !wallet || baselineBaseUnits === null) {
      setStatus('idle');
      return;
    }

    setStatus('pending');

    const onBalance = (raw: unknown) => {
      const parsed = BalanceUpdateEventSchema.safeParse(raw);
      if (!parsed.success || parsed.data.address !== wallet) return;
      if (!hasStlfSettled(parsed.data.tokens, stlfMint, baselineBaseUnits)) {
        return;
      }
      if (__DEV__) console.log('[reflect] settled via balance:updated');
      setStatus('settled');
    };

    socketService.on('balance:updated', onBalance);
    const timer = setTimeout(
      () => setStatus((s) => (s === 'pending' ? 'slow' : s)),
      timeoutMs,
    );

    return () => {
      socketService.off('balance:updated', onBalance);
      clearTimeout(timer);
    };
  }, [enabled, wallet, stlfMint, baselineBaseUnits, timeoutMs]);

  return status;
}
