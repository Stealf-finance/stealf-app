/**
 * Brand marks without brand assets.
 *
 * The Store ships no logo images: a gift card is drawn as a monogram on a
 * tinted tile, derived deterministically from the product. When the catalog
 * goes live, Bitrefill's `image` URL takes over and this becomes the fallback
 * for products that have none — which is the case for a real slice of them.
 */

/** Up to two initials: "Amazon" → "A", "Uber Eats" → "UE", "H&M" → "H". */
export function monogram(name: string): string {
  const words = name
    .split(/[\s\-_]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A stable hue per product, so a brand keeps its colour across renders and
 * screens without a lookup table. FNV-1a — small, deterministic, and it
 * scatters neighbouring ids (amazon-fr / apple-fr) to different hues.
 */
export function brandHue(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % 360;
}

/** The tile's fill and the monogram's ink, muted enough to sit on black. */
export function brandColors(seed: string): { bg: string; ink: string } {
  const hue = brandHue(seed);
  return {
    bg: `hsl(${hue}, 42%, 26%)`,
    ink: `hsl(${hue}, 62%, 82%)`,
  };
}
