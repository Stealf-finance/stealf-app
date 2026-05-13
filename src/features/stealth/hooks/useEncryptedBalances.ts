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

/** Raw on-chain data the cached query holds. USD/symbol/etc. are derived
 *  outside the cache so price refreshes flow through render without forcing
 *  a refetch (and don't leave stale fiat in the cached payload). */
type RawEncryptedToken = {
  mint: string;
  amountRaw: bigint;
  state: string | null;
};
type RawEncryptedBalances = { tokens: RawEncryptedToken[] };

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

// Stablecoins floor — backend may report 0 balance + 0 balanceUSD when the
// public ATA is empty (typical right after shielding the full position),
// which would otherwise collapse the derived per-unit price to 0 and zero
// out fiat for the encrypted side. Mirrors mapTokenToAsset.STABLE_PRICES.
const STABLE_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  EURC: 1,
};

// `mints` MUST be pre-sorted by the caller — the hook below guarantees this
// via its memoized signature so we can drop the per-call `.slice().sort()`.
export const encryptedBalancesQueries = {
  byStealfWallet: (wallet: string, mints: readonly string[]) =>
    ['stealth', 'encrypted-balances', wallet, ...mints] as const,
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

  // Two-step memo so the `mints` array reference stays stable when the
  // mint *set* hasn't actually changed, even if publicBalance refetches
  // for unrelated reasons (balance amount updates, refetchOnFocus, etc.).
  // Without this, every refetch would yield a new mints reference → new
  // query key → cache miss on the encrypted-balances query.
  const mintsSignature = useMemo(() => {
    const set = new Set<string>([SOL_MINT]);
    (publicBalance?.tokens ?? []).forEach((t) => {
      if (t.tokenMint) set.add(t.tokenMint);
    });
    return Array.from(set).sort().join('|');
  }, [publicBalance]);
  const mints = useMemo(() => mintsSignature.split('|'), [mintsSignature]);
  const queryKey = useMemo(
    () => encryptedBalancesQueries.byStealfWallet(wallet, mints),
    [wallet, mints],
  );

  // Per-mint metadata derived from the public balance — labels encrypted
  // entries with the same icon/symbol the user sees publicly, instead of
  // bare addresses. Recomputes when solPrice or public balance changes,
  // and the derivation in the wrapper memo below picks the new values up
  // immediately without invalidating the cached on-chain query.
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
      const derivedPrice =
        isSol && typeof solPrice === 'number' && solPrice > 0
          ? solPrice
          : t.balance > 0
            ? t.balanceUSD / t.balance
            : 0;
      const price = STABLE_PRICES[symbol] ?? derivedPrice;
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

  const baseQuery = useQuery<RawEncryptedBalances>({
    queryKey,
    queryFn: async () => {
      const raw = await fetchEncryptedBalances(mints as Address[]);
      const tokens: RawEncryptedToken[] = mints.map((mint) => {
        const entry = raw.get(mint as Address);
        let amountRaw = 0n;
        if (
          entry?.state === 'shared' &&
          typeof entry.balance === 'bigint' &&
          entry.balance >= 0n &&
          entry.balance <= MAX_PLAUSIBLE_RAW
        ) {
          amountRaw = entry.balance as bigint;
        }
        return { mint, amountRaw, state: entry?.state ?? null };
      });
      return { tokens };
    },
    enabled: !!wallet && mints.length > 0,
    staleTime: 30_000,
    refetchOnReconnect: true,
  });

  const derived = useMemo<EncryptedBalances | undefined>(() => {
    if (!baseQuery.data) return undefined;
    const tokens: EncryptedTokenBalance[] = [];
    let totalUSD = 0;
    baseQuery.data.tokens.forEach((t) => {
      const meta = metaByMint.get(t.mint) ?? {
        symbol: t.mint.slice(0, 4),
        decimals: 6,
        iconUri: undefined,
        price: 0,
      };
      const amount = Number(t.amountRaw) / 10 ** meta.decimals;
      const amountUSD = amount * meta.price;
      totalUSD += amountUSD;
      tokens.push({
        mint: t.mint,
        symbol: meta.symbol,
        decimals: meta.decimals,
        amount,
        amountRaw: t.amountRaw,
        amountUSD,
        iconUri: meta.iconUri,
        state: t.state,
      });
    });
    return { tokens, totalUSD };
  }, [baseQuery.data, metaByMint]);

  // Reshape the query result so the cached payload's data type doesn't leak
  // out — callers expect EncryptedBalances on `.data`, not the raw on-chain
  // shape we hold in the cache.
  return { ...baseQuery, data: derived } as Omit<typeof baseQuery, 'data'> & {
    data: EncryptedBalances | undefined;
  };
}
