// Spacing scale — the canonical spacing tokens used across screens and
// primitives. Use these in new code. Existing literal values are
// grandfathered until touched (migrate at touch time).
//
// Name `Sp` (not `S`) because `S` is already widely used as
// `txPalette('silver')` alias across feature screens.

export const Sp = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// Screen-level horizontal padding. Most body content scrolls use this.
export const SCREEN_GUTTER = Sp.xl; // 24

// Header rows are intentionally tighter than body content (TxHeader,
// PageTitleHeader). Kept distinct from SCREEN_GUTTER to preserve the
// existing visual rhythm.
export const HEADER_GUTTER = 20;
