import type { z } from 'zod';
import type {
  BalanceResponseSchema,
  TokenBalanceSchema,
} from './api/balance';
import type {
  HistoryResponseSchema,
  TransactionSchema,
} from './api/history';

export type TokenBalance = z.infer<typeof TokenBalanceSchema>;
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
