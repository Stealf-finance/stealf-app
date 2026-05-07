export { LAMPORTS_PER_SOL, solToLamports, lamportsToSol } from '@/src/services/solana/kit';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Official Solana Labs token-list logo (CDN). Same source Phantom, Solflare,
// and Jupiter pull from. We render it as a remote URI everywhere instead of
// bundling a PNG, so SOL gets the same treatment as any other on-chain token.
export const SOL_ICON_URI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${SOL_MINT}/logo.png`;

export const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;

export const STEALF_JITO_VAULT = '7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7';
