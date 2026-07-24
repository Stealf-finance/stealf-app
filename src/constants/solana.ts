export { LAMPORTS_PER_SOL, solToLamports, lamportsToSol } from '@/src/services/solana/kit';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export const USDC_DECIMALS = 6;

export type KnownTokenMeta = {
  symbol: string;
  name: string;
  decimals: number;
  iconUri?: string;
};
export const SOL_ICON_URI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${SOL_MINT}/logo.png`;

const USDC_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
const USDT_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png';

