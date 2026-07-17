export { LAMPORTS_PER_SOL, solToLamports, lamportsToSol } from '@/src/services/solana/kit';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';


export const SOL_ICON_URI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${SOL_MINT}/logo.png`;

// MAINNET USDC.
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;

// Umbra stealth stablecoins. On MAINNET the stealth stablecoins ARE the real
// USDC / USDT (unlike devnet's dUSDC/dUSDT test tokens). Kept under the same
// export names so importers don't break; `DUSDC_MINT === USDC_MINT` on mainnet.
export const DUSDC_MINT = USDC_MINT;
export const DUSDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

export type KnownTokenMeta = {
  symbol: string;
  name: string;
  decimals: number;
  iconUri?: string;
};

// Official USDC/USDT logos (same CDN as SOL_ICON_URI).
const USDC_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
const USDT_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png';

export const KNOWN_TOKENS_BY_MINT: Record<string, KnownTokenMeta> = {
  [USDC_MINT]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUri: USDC_LOGO_URI,
  },
  [DUSDT_MINT]: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    iconUri: USDT_LOGO_URI,
  },
};

/** Client-side metadata override for mints that on-chain registries can't
 *  resolve (the Umbra stealth stablecoins). Returns undefined for everything
 *  else so normal resolution is untouched. */
export function knownTokenByMint(
  mint: string | null | undefined,
): KnownTokenMeta | undefined {
  if (!mint) return undefined;
  return KNOWN_TOKENS_BY_MINT[mint];
}

export const STEALF_JITO_VAULT = '7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7';
