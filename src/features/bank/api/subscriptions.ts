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

const HISTORY_LIMIT_DEFAULT = 10;

export function subscribeToWalletUpdates(
  queryClient: QueryClient,
  address: string,
): () => void {
  const onBalance = (raw: unknown) => {
    const parsed = BalanceUpdateEventSchema.safeParse(raw);
    if (!parsed.success) {
      if (__DEV__) console.warn('[bank] balance:updated rejected', parsed.error);
      return;
    }
    if (parsed.data.address !== address) return;
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
      if (__DEV__) console.warn('[bank] transaction:new rejected', parsed.error);
      return;
    }
    if (parsed.data.address !== address) return;
    queryClient.setQueryData<HistoryResponse>(
      historyQueries.byAddress(address, HISTORY_LIMIT_DEFAULT),
      (prev) => {
        const existing = prev?.transactions ?? [];
        if (existing.some((t) => t.signature === parsed.data.transaction.signature)) {
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
    socketService.off('balance:updated', onBalance);
    socketService.off('transaction:new', onTx);
    socketService.unsubscribeFromWallet(address);
  };
}
