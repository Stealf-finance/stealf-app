/**
 * Compact number label (K / M / B), one decimal, trailing `.0` trimmed:
 * 950 → "950", 1_500 → "1.5K", 14_200_000 → "14.2M". Non-finite → "—".
 * Used for the JitoSOL pool figures (total staked, JitoSOL supply).
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, '');
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3)}K`;
  return trim(n);
}
