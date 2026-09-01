export function monogram(name: string): string {
  const words = name
    .split(/[\s\-_]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function brandHue(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % 360;
}

export function brandColors(seed: string): { bg: string; ink: string } {
  const hue = brandHue(seed);
  return {
    bg: `hsl(${hue}, 42%, 26%)`,
    ink: `hsl(${hue}, 62%, 82%)`,
  };
}

const ART_BUCKETS = [360, 540, 720];

/** Aspect ratio of Bitrefill's card artwork. */
export const BRAND_ART_RATIO = 5 / 3;

/** The full 5:3 card artwork — the brand's own design, not just its logo. */
export function brandArtUrl(id: string, width: number): string {
  const w = ART_BUCKETS.find((b) => b >= width * 3) ?? 720;
  const h = Math.round(w / BRAND_ART_RATIO);
  return `https://cdn.bitrefill.com/primg/w${w}h${h}/${encodeURIComponent(id)}.webp`;
}
