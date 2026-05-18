// Shared PII / secret scrubbing for analytics + crash reporting.
// Sentry uses this in `beforeSend` / `beforeBreadcrumb`; PostHog uses
// `scrubString` on the `error` field of `*_failed` events, since the
// PostHog SDK has no equivalent hook.

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BS58_RE = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function scrubString(value: string): string {
  return value
    .replace(JWT_RE, '[redacted:jwt]')
    .replace(EMAIL_RE, '[redacted:email]')
    .replace(BS58_RE, '[redacted:bs58]');
}

/**
 * Bucketize a USD-denominated amount into a coarse band. Avoids leaking
 * exact transaction amounts to analytics while preserving usable
 * dimensions (small vs whale).
 */
export function amountBand(usd: number): 'micro' | 'small' | 'medium' | 'large' | 'whale' {
  if (!Number.isFinite(usd) || usd < 0) return 'micro';
  if (usd < 1) return 'micro';
  if (usd < 50) return 'small';
  if (usd < 500) return 'medium';
  if (usd < 5000) return 'large';
  return 'whale';
}
