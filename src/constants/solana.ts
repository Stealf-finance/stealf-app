export { LAMPORTS_PER_SOL, solToLamports, lamportsToSol } from '@/src/services/solana/kit';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Official Solana Labs token-list logo (CDN). Same source Phantom, Solflare,
// and Jupiter pull from. We render it as a remote URI everywhere instead of
// bundling a PNG, so SOL gets the same treatment as any other on-chain token.
export const SOL_ICON_URI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${SOL_MINT}/logo.png`;

export const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;

// Umbra devnet test stablecoins. These mints carry no on-chain metadata, so
// Helius/token registries resolve them as "unknown" — we override by mint on
// the client. Devnet-only: they don't exist on mainnet, and the override is
// keyed on the exact mint so it can never collide with a real mainnet token.
export const DUSDC_MINT = '4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7';
export const DUSDT_MINT = 'DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6';

export type KnownTokenMeta = {
  symbol: string;
  name: string;
  decimals: number;
  iconUri?: string;
};

// Reuse the official USDC/USDT logos (same CDN as SOL_ICON_URI) so the devnet
// stablecoins render with recognizable icons.
const USDC_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
const USDT_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png';

export const KNOWN_TOKENS_BY_MINT: Record<string, KnownTokenMeta> = {
  [DUSDC_MINT]: {
    symbol: 'dUSDC',
    name: 'Devnet USDC',
    decimals: 6,
    iconUri: USDC_LOGO_URI,
  },
  [DUSDT_MINT]: {
    symbol: 'dUSDT',
    name: 'Devnet USDT',
    decimals: 6,
    iconUri: USDT_LOGO_URI,
  },
};

/** Client-side metadata override for mints that on-chain registries can't
 *  resolve (currently the Umbra devnet test stablecoins). Returns undefined
 *  for everything else so normal resolution is untouched. */
export function knownTokenByMint(
  mint: string | null | undefined,
): KnownTokenMeta | undefined {
  if (!mint) return undefined;
  return KNOWN_TOKENS_BY_MINT[mint];
}

export const STEALF_JITO_VAULT = '7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7';
