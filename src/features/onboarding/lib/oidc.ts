import { Buffer } from 'buffer';


export function decodeOidcEmail(token: string): string | undefined {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const b64url = parts[1];
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, 'base64').toString('utf8'),
    ) as { email?: unknown };
    const email = payload.email;
    if (typeof email !== 'string' || email.length === 0) return undefined;
    return email;
  } catch {
    return undefined;
  }
}
