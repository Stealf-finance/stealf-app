import { SOL_ICON_URI } from '@/src/constants/solana';

export type SwapToken = {
  symbol: string;
  name: string;
  /** Mainnet mint (Jupiter swaps are mainnet). */
  mint: string;
  decimals: number;
  logoUri: string;
};

const USDC_LOGO =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';

/**
 * Curated swap tokens (mainnet). Stub for now — will be replaced by the
 * backend-hosted token list. SOL uses the wrapped-SOL mint that Jupiter expects.
 */
export const SWAP_TOKENS: SwapToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logoUri: USDC_LOGO,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoUri: SOL_ICON_URI,
  },
];
