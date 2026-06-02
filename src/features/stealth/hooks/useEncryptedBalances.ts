import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { Address } from '@solana/kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { fetchEncryptedBalances } from '@/src/services/umbra/queries/balances';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import { LAMPORTS_PER_SOL } from '@/src/services/solana/kit';
import type { BalanceResponse } from '@/src/features/bank/types';

export type EncryptedTokenBalance = {
  mint: string;
  symbol: string;
  decimals: number;
  amount: number;
  amountRaw: bigint;
  amountUSD: number;
  iconUri?: string;
  state: string | null;
};

export type EncryptedBalances = {
  tokens: EncryptedTokenBalance[];
  totalUSD: number;
};

export type RawEncryptedToken = {
  mint: string;
  amountRaw: bigint;
  state: string | null;
};
export type RawEncryptedBalances = { tokens: RawEncryptedToken[] };

const MAX_PLAUSIBLE_RAW = 1_000_000_000n * BigInt(LAMPORTS_PER_SOL);

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  WSOL: 9,
  USDC: 6,
  USDT: 6,
  JUP: 6,
  BONK: 5,
};

const STABLE_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  EURC: 1,
  dUSDC: 1,
  dUSDT: 1,
};

export const encryptedBalancesQueries = {
  byStealfWallet: (wallet: string, mints: readonly string[]) =>
    ['stealth', 'encrypted-balances', wallet, ...mints] as const,
  /**
   * Mint-agnostic prefix — use for `invalidateQueries` to hit every
   * per-mint variant of a wallet's encrypted balances at once.
   */
  byStealfWalletPrefix: (wallet: string) =>
    ['stealth', 'encrypted-balances', wallet] as const,
};

export function buildEncryptedMintList(
  publicBalance: BalanceResponse | undefined,
): string[] {
  const set = new Set<string>([SOL_MINT]);
  (publicBalance?.tokens ?? []).forEach((t) => {
    if (t.tokenMint) set.add(t.tokenMint);
  });
  return Array.from(set).sort();
}

export async function fetchEncryptedBalancesRaw(
  mints: readonly string[],
): Promise<RawEncryptedBalances> {
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
}

export async function prefetchEncryptedBalancesFor(
  queryClient: QueryClient,
  stealfWallet: string,
  publicBalance: BalanceResponse | undefined,
): Promise<void> {
  const mints = buildEncryptedMintList(publicBalance);
  if (mints.length === 0) return;
  await queryClient.prefetchQuery({
    queryKey: encryptedBalancesQueries.byStealfWallet(stealfWallet, mints),
    queryFn: () => fetchEncryptedBalancesRaw(mints),
    staleTime: 30_000,
  });
}

export function useEncryptedBalances() {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';
  const { data: publicBalance } = useBalance(user?.stealfWallet ?? null);
  const { data: solPrice } = useSolPrice();

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
    queryFn: () => fetchEncryptedBalancesRaw(mints),
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

  return { ...baseQuery, data: derived } as Omit<typeof baseQuery, 'data'> & {
    data: EncryptedBalances | undefined;
  };
}
