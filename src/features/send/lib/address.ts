export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Only base58 keys shrink — .sol names and labels are left whole. */
export function truncateAddress(input: string, head = 6, tail = 4): string {
  const s = input.trim();
  if (s.length <= head + tail + 1) return s;
  if (!SOLANA_ADDRESS_RE.test(s)) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
