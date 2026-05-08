import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { fetchEncryptedBalances } from '@/src/services/umbra/queries/balances';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import { LAMPORTS_PER_SOL } from '@/src/services/solana/kit';

export type EncryptedTokenBalance = {
  mint: string;
  symbol: string;
  decimals: number;
  /** Humanized balance (e.g. 12.34 for 12.34 USDC). */
  amount: number;
  /** Raw on-chain amount in token base units. */
  amountRaw: bigint;
  amountUSD: number;
  iconUri?: string;
  /** SDK-reported encrypted account state — 'shared' means active. */
  state: string | null;
};

export type EncryptedBalances = {
  tokens: EncryptedTokenBalance[];
  totalUSD: number;
};

// Anything above 1B SOL/equivalent is garbage (corrupted account or wrong keys).
const MAX_PLAUSIBLE_RAW = 1_000_000_000n * BigInt(LAMPORTS_PER_SOL);

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  WSOL: 9,
  USDC: 6,
  USDT: 6,
  JUP: 6,
  BONK: 5,
};

export const encryptedBalancesQueries = {
  byStealfWallet: (wallet: string, mints: readonly string[]) =>
    ['stealth', 'encrypted-balances', wallet, ...mints.slice().sort()] as const,
};

/**
 * Multi-mint encrypted balance query. Always includes SOL plus every mint
 * the user holds on their public stealth ATA — i.e. tokens they're aware of.
 * Tokens shielded but no longer held publicly will be missed; expand the
 * mint list if/when that becomes a real case.
 */
export function useEncryptedBalances() {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';
  const { data: publicBalance } = useBalance(user?.stealfWallet ?? null);
  const { data: solPrice } = useSolPrice();

  // Build the mint set from public ATA + SOL. Memoized on identity so the
  // query key stays stable across unrelated re-renders.
  const mints = useMemo(() => {
    const set = new Set<string>([SOL_MINT]);
    (publicBalance?.tokens ?? []).forEach((t) => {
      if (t.tokenMint) set.add(t.tokenMint);
    });
    return Array.from(set);
  }, [publicBalance]);

  // Per-mint metadata derived from the public balance — labels encrypted
  // entries with the same icon/symbol the user sees publicly, instead of
  // bare addresses.
  const metaByMint = useMemo(() => {
    const map = new Map<
      string,
      { symbol: string; decimals: number; iconUri?: string; price: number }
    >();
    (publicBalance?.tokens ?? []).forEach((t) => {
      const isSol = t.tokenMint === null || t.tokenSymbol === 'SOL';
      const mint = isSol ? SOL_MINT : (t.tokenMint as string);
      const symbol = t.tokenSymbol;
      const decimals =
        TOKEN_DECIMALS[symbol] ??
        (typeof t.tokenDecimals === 'number' ? t.tokenDecimals : 6);
      const price =
        isSol && typeof solPrice === 'number' && solPrice > 0
          ? solPrice
          : t.balance > 0
            ? t.balanceUSD / t.balance
            : 0;
      map.set(mint, {
        symbol,
        decimals,
        iconUri: isSol ? SOL_ICON_URI : t.tokenIcon ?? undefined,
        price,
      });
    });
    if (!map.has(SOL_MINT)) {
      map.set(SOL_MINT, {
        symbol: 'SOL',
        decimals: 9,
        iconUri: SOL_ICON_URI,
        price: typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0,
      });
    }
    return map;
  }, [publicBalance, solPrice]);

  return useQuery<EncryptedBalances>({
    queryKey: encryptedBalancesQueries.byStealfWallet(wallet, mints),
    queryFn: async () => {
      const raw = await fetchEncryptedBalances(mints as Address[]);

      const tokens: EncryptedTokenBalance[] = [];
      let totalUSD = 0;

      mints.forEach((mint) => {
        const entry = raw.get(mint as Address);
        const meta = metaByMint.get(mint) ?? {
          symbol: mint.slice(0, 4),
          decimals: 6,
          iconUri: undefined,
          price: 0,
        };

        let amountRaw = 0n;
        if (
          entry?.state === 'shared' &&
          typeof entry.balance === 'bigint' &&
          entry.balance >= 0n &&
          entry.balance <= MAX_PLAUSIBLE_RAW
        ) {
          amountRaw = entry.balance as bigint;
        }

        const amount = Number(amountRaw) / 10 ** meta.decimals;
        const amountUSD = amount * meta.price;
        totalUSD += amountUSD;

        tokens.push({
          mint,
          symbol: meta.symbol,
          decimals: meta.decimals,
          amount,
          amountRaw,
          amountUSD,
          iconUri: meta.iconUri,
          state: entry?.state ?? null,
        });
      });

      return { tokens, totalUSD };
    },
    enabled: !!wallet && mints.length > 0,
    staleTime: 30_000,
    refetchOnReconnect: true,
  });
}
