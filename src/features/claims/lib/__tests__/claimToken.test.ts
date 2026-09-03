import { describe, expect, it } from 'vitest';
import { SOL_MINT, USDC_MINT } from '@/src/constants/solana';
import { dUSDC, dUSDT } from '@/src/services/umbra/constant';
import {
  claimTokenForMint,
  USDC_MAINNET_MINT,
  USDT_MAINNET_MINT,
} from '../claimToken';

describe('claimTokenForMint', () => {
  it('knows the devnet stablecoins the app transacts in', () => {
    // These are what an incoming private transfer carries on devnet, and the
    // old two-case switch had neither: every row read "—".
    expect(claimTokenForMint(dUSDC, null)).toEqual({
      symbol: 'dUSDC',
      decimals: 6,
      usdPerUnit: 1,
      iconUri: expect.stringContaining('logo.png'),
    });
    expect(claimTokenForMint(dUSDT, null)?.symbol).toBe('dUSDT');
  });

  it('knows the mainnet stablecoins', () => {
    expect(claimTokenForMint(USDC_MAINNET_MINT, null)?.symbol).toBe('USDC');
    expect(claimTokenForMint(USDT_MAINNET_MINT, null)?.symbol).toBe('USDT');
    expect(claimTokenForMint(USDC_MINT, null)?.symbol).toBe('USDC');
  });

  it('prices SOL from the oracle and stablecoins at one', () => {
    expect(claimTokenForMint(SOL_MINT, 187.5)?.usdPerUnit).toBe(187.5);
    expect(claimTokenForMint(SOL_MINT, null)?.usdPerUnit).toBeNull();
    expect(claimTokenForMint(dUSDC, null)?.usdPerUnit).toBe(1);
  });

  it('gives up on an unlisted mint rather than guessing its decimals', () => {
    expect(claimTokenForMint('SomeUnknownMint1111111111111111', 1)).toBeNull();
    expect(claimTokenForMint(null, 1)).toBeNull();
  });
});
