import { Buffer } from 'buffer';


function decodeOidcPayload(token: string): Record<string, unknown> | undefined {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const b64url = parts[1];
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(
      Buffer.from(padded, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function decodeOidcEmail(token: string): string | undefined {
  const payload = decodeOidcPayload(token);
  if (!payload) return undefined;
  const email = payload.email;
  if (typeof email !== 'string' || email.length === 0) return undefined;
  return email;
}

export function decodeOidcSub(token: string): string | undefined {
  const payload = decodeOidcPayload(token);
  if (!payload) return undefined;
  const sub = payload.sub;
  if (typeof sub !== 'string' || sub.length === 0) return undefined;
  return sub;
}
