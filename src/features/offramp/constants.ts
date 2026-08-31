import { getEnv } from '@/src/services/env';
import { USDC_DECIMALS } from '@/src/constants/solana';

/**
 * Off-ramp (cash-out) — turn on-chain USDC into fiat in the user's bank via
 * Noah. This is a MAINNET-only feature by nature:
 *  - it moves REAL USDC (Noah pays real fiat out); devnet USDC is worthless to it,
 *  - the backend 503s every off-ramp route until a Noah account is provisioned
 *    (NOAH_API_KEY + signing key on the server).
 *
 * So it stays behind `OFFRAMP_ENABLED` until launch: the entry point is hidden
 * and the screen shows a "coming at mainnet" state instead of hitting the API.
 * Flip to true once (a) the server has Noah creds and (b) the app points at a
 * mainnet RPC.
 */
export const OFFRAMP_ENABLED = false;

/**
 * Noah's identifiers for our asset. CryptoCurrency + Network are sent
 * separately (the payout rule keys off `Network` = "Solana"). ⚠️ The exact
 * CryptoCurrency code still needs sandbox confirmation — Noah may namespace it
 * (e.g. "USDC_SOL"); "USDC" is the consistent default given the backend sends
 * Network apart.
 */
export const OFFRAMP_CRYPTO_CURRENCY = 'USDC';
export const OFFRAMP_NETWORK = 'Solana';

/**
 * MAINNET USDC mint — the off-ramp moves REAL USDC, so it must NOT use the
 * devnet `USDC_MINT` from `@/src/constants/solana` (that's `4zMMC9…`). This is
 * the canonical Solana-mainnet USDC.
 */
export const OFFRAMP_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const OFFRAMP_USDC_DECIMALS = USDC_DECIMALS;

/** Slippage floor on the deposited amount, in basis points (0.5%). */
export const OFFRAMP_MIN_AMOUNT_SLIPPAGE_BPS = 50;

/** Cheap mainnet guard: we're live only when NOT on a devnet/testnet RPC. */
export function isMainnetRpc(): boolean {
  const url = getEnv().EXPO_PUBLIC_SOLANA_RPC_URL ?? '';
  return url.length > 0 && !/devnet|testnet/i.test(url);
}

/** Single source of truth for whether the cash-out flow may run at all. */
export function isOfframpAvailable(): boolean {
  return OFFRAMP_ENABLED && isMainnetRpc();
}
