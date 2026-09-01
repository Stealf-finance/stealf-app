const A = 0x1f1e6;

/** ISO 3166-1 alpha-2 to its flag emoji. Empty for anything else. */
export function countryFlag(code: string | undefined): string {
  const cc = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(
    ...[...cc].map((ch) => A + ch.charCodeAt(0) - 65),
  );
}

/** The market the catalog is scoped to: its most common country. See STORE.md. */
export function dominantCountry(
  products: readonly { country?: string }[],
): string | undefined {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.country) continue;
    counts.set(p.country, (counts.get(p.country) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  // Alphabetical first, then a strict >, so a tie always resolves the same way.
  for (const [code, n] of [...counts].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (n > bestCount) {
      best = code;
      bestCount = n;
    }
  }
  return best;
}
