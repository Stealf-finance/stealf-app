/** Mint → token metadata for a claim row. An unlisted mint has no decimals to scale by. */
import {
  SOL_ICON_URI,
  SOL_MINT,
  USDC_LOGO_URI,
  USDC_MINT,
  USDT_LOGO_URI,
} from '@/src/constants/solana';
import { dUSDC, dUSDT } from '@/src/services/umbra/constant';
import type { ClaimToken } from './describeClaimLine';

/** The mainnet stablecoins an incoming transfer actually carries. */
export const USDC_MAINNET_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDT_MAINNET_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

type Entry = {
  symbol: string;
  decimals: number;
  iconUri: string;
  /** A dollar stablecoin — priced at 1, no oracle needed. */
  stable: boolean;
};

const BY_MINT: Record<string, Entry> = {
  [SOL_MINT]: {
    symbol: 'SOL',
    decimals: 9,
    iconUri: SOL_ICON_URI,
    stable: false,
  },
  [USDC_MAINNET_MINT]: {
    symbol: 'USDC',
    decimals: 6,
    iconUri: USDC_LOGO_URI,
    stable: true,
  },
  [USDT_MAINNET_MINT]: {
    symbol: 'USDT',
    decimals: 6,
    iconUri: USDT_LOGO_URI,
    stable: true,
  },
  [USDC_MINT]: {
    symbol: 'USDC',
    decimals: 6,
    iconUri: USDC_LOGO_URI,
    stable: true,
  },
  [dUSDC]: {
    symbol: 'dUSDC',
    decimals: 6,
    iconUri: USDC_LOGO_URI,
    stable: true,
  },
  [dUSDT]: {
    symbol: 'dUSDT',
    decimals: 6,
    iconUri: USDT_LOGO_URI,
    stable: true,
  },
};

export function claimTokenForMint(
  mint: string | null | undefined,
  solUsd: number | null,
): ClaimToken | null {
  const entry = mint ? BY_MINT[mint] : undefined;
  if (!entry) return null;
  return {
    symbol: entry.symbol,
    decimals: entry.decimals,
    usdPerUnit: entry.stable ? 1 : solUsd,
    iconUri: entry.iconUri,
  };
}
