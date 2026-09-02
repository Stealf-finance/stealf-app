import { describe, expect, it } from 'vitest';
import { hasStlfSettled, stlfBaseUnits } from '../stlfSettlement';

const STLF_MINT = 'BenJy1n3WTx9mTjevqRGtY2NUSshFRkAaYDvFB1ZNwbf';
const OTHER_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const token = (mint: string | null, balance: number) => ({
  tokenMint: mint,
  tokenSymbol: 'X',
  tokenDecimals: 6,
  balance,
  balanceUSD: 0,
});

describe('stlfBaseUnits', () => {
  it('reads the STLF holding as base units', () => {
    expect(stlfBaseUnits([token(STLF_MINT, 48.72)], STLF_MINT)).toBe(
      48_720_000,
    );
  });

  it('reads 0 when the wallet holds no STLF token yet', () => {
    expect(stlfBaseUnits([token(OTHER_MINT, 500)], STLF_MINT)).toBe(0);
  });

  it('ignores the native SOL entry, whose mint is null', () => {
    expect(stlfBaseUnits([token(null, 1.5)], STLF_MINT)).toBe(0);
  });
});

describe('hasStlfSettled', () => {
  it('settles a buy — STLF appears where the wallet held none', () => {
    expect(hasStlfSettled([token(STLF_MINT, 48.72)], STLF_MINT, 0)).toBe(true);
  });

  it('settles a full sell — the holding drops to zero', () => {
    expect(hasStlfSettled([token(STLF_MINT, 0)], STLF_MINT, 48_720_000)).toBe(
      true,
    );
  });

  it('settles a full sell even when the emptied token entry is dropped', () => {
    expect(
      hasStlfSettled([token(OTHER_MINT, 500)], STLF_MINT, 48_720_000),
    ).toBe(true);
  });

  it('does not settle on an unrelated transaction touching the same wallet', () => {
    expect(
      hasStlfSettled([token(STLF_MINT, 48.72)], STLF_MINT, 48_720_000),
    ).toBe(false);
  });

  it('does not settle on float noise below one base unit', () => {
    // 48.72 in ui amounts round-trips imprecisely; a sub-base-unit wobble is
    // not a balance change.
    expect(
      hasStlfSettled([token(STLF_MINT, 48.7200000001)], STLF_MINT, 48_720_000),
    ).toBe(false);
  });

  it('never settles without a mint to match on', () => {
    expect(hasStlfSettled([token(STLF_MINT, 48.72)], undefined, 0)).toBe(false);
  });
});
