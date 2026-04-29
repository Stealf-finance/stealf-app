import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const TransactionSchema = z.object({
  signature: z.string(),
  amount: z.number(),
  amountUSD: z.number(),
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
  tokenDecimals: z.number(),
  signatureURL: z.string(),
  walletAddress: z.string(),
  dateFormatted: z.string(),
  status: z.string(),
  type: z.enum(['sent', 'received', 'unknown']),
  slot: z.number(),
});

export const HistoryResponseSchema = z.object({
  address: z.string(),
  count: z.number(),
  transactions: z.array(TransactionSchema),
});

export const historyQueries = {
  byAddress: (address: string) => ['wallet-history', address] as const,
};

export async function fetchHistory(
  token: string,
  address: string,
  limit = 10,
) {
  if (__DEV__) console.log('[bank/history] fetch', address, `limit=${limit}`);
  const raw = await apiGet(
    `/api/wallet/history/${address}?limit=${limit}`,
    token,
  );
  const parsed = HistoryResponseSchema.parse(raw);
  if (__DEV__)
    console.log(
      '[bank/history] fetched',
      address,
      `${parsed.transactions.length}/${parsed.count} txs`,
    );
  return parsed;
}
