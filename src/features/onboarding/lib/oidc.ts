import { Buffer } from 'buffer';

// Pulls the `email` claim out of an OIDC id_token (Google / Apple) without
// verifying the signature — Turnkey already validates server-side; this is
// purely to read a claim the SDK doesn't surface uniformly. The claim is
// only ever used to pre-fill a signup payload, never to authenticate.
export function decodeOidcEmail(token: string): string | undefined {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as { email?: unknown };
    const email = payload.email;
    if (typeof email !== 'string' || email.length === 0) return undefined;
    return email;
  } catch {
    return undefined;
  }
}
