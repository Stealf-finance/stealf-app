import { z } from 'zod';
import type { QueryClient } from '@tanstack/react-query';
import { socketService } from '@/src/services/real-time/socket';
import {
  BalanceResponseSchema,
  TokenBalanceSchema,
  balanceQueries,
} from './balance';
import {
  HistoryResponseSchema,
  TransactionSchema,
  historyQueries,
} from './history';
import type { HistoryResponse } from '../types';

const BalanceUpdateEventSchema = z.object({
  address: z.string(),
  tokens: z.array(TokenBalanceSchema),
  totalUSD: z.number(),
  timestamp: z.string().optional(),
});

const TransactionEventSchema = z.object({
  address: z.string(),
  transaction: TransactionSchema,
  timestamp: z.string().optional(),
});

export function subscribeToWalletUpdates(
  queryClient: QueryClient,
  address: string,
): () => void {
  if (__DEV__) console.log('[bank/sub] subscribeToWalletUpdates', address);

  const onBalance = (raw: unknown) => {
    const parsed = BalanceUpdateEventSchema.safeParse(raw);
    if (!parsed.success) {
      if (__DEV__)
        console.warn(
          '[bank/sub] balance:updated rejected by Zod',
          parsed.error.issues,
        );
      return;
    }
    if (parsed.data.address !== address) {
      if (__DEV__)
        console.log('[bank/sub] balance:updated ignored — address mismatch', {
          event: parsed.data.address,
          watching: address,
        });
      return;
    }
    if (__DEV__)
      console.log(
        '[bank/sub] balance:updated → setQueryData',
        address,
        `$${parsed.data.totalUSD.toFixed(2)}`,
      );
    queryClient.setQueryData(
      balanceQueries.byAddress(address),
      BalanceResponseSchema.parse({
        address: parsed.data.address,
        tokens: parsed.data.tokens,
        totalUSD: parsed.data.totalUSD,
      }),
    );
  };

  const onTx = (raw: unknown) => {
    const parsed = TransactionEventSchema.safeParse(raw);
    if (!parsed.success) {
      if (__DEV__)
        console.warn(
          '[bank/sub] transaction:new rejected by Zod',
          parsed.error.issues,
        );
      return;
    }
    if (parsed.data.address !== address) {
      if (__DEV__)
        console.log('[bank/sub] transaction:new ignored — address mismatch', {
          event: parsed.data.address,
          watching: address,
        });
      return;
    }
    if (__DEV__)
      console.log(
        '[bank/sub] transaction:new → setQueryData',
        address,
        parsed.data.transaction.type,
        `$${parsed.data.transaction.amountUSD.toFixed(2)}`,
        parsed.data.transaction.signature.slice(0, 8),
      );
    queryClient.setQueryData<HistoryResponse>(
      historyQueries.byAddress(address),
      (prev) => {
        const existing = prev?.transactions ?? [];
        if (
          existing.some(
            (t) => t.signature === parsed.data.transaction.signature,
          )
        ) {
          if (__DEV__)
            console.log(
              '[bank/sub] tx duplicate skipped',
              parsed.data.transaction.signature.slice(0, 8),
            );
          return prev;
        }
        return HistoryResponseSchema.parse({
          address,
          count: (prev?.count ?? 0) + 1,
          transactions: [parsed.data.transaction, ...existing],
        });
      },
    );
  };

  socketService.on('balance:updated', onBalance);
  socketService.on('transaction:new', onTx);
  socketService.subscribeToWallet(address);

  return () => {
    if (__DEV__) console.log('[bank/sub] unsubscribe', address);
    socketService.off('balance:updated', onBalance);
    socketService.off('transaction:new', onTx);
    socketService.unsubscribeFromWallet(address);
  };
}
