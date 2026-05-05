import { describe, it, expect } from 'vitest';
import { decodeOidcEmail } from '../oidc';

function makeJwt(payload: unknown): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('decodeOidcEmail', () => {
  it('extracts email from a Google-shaped OIDC token', () => {
    const token = makeJwt({
      iss: 'https://accounts.google.com',
      sub: '12345',
      email: 'jane@gmail.com',
      email_verified: true,
      aud: 'client',
    });
    expect(decodeOidcEmail(token)).toBe('jane@gmail.com');
  });

  it('extracts email from an Apple-shaped OIDC token', () => {
    const token = makeJwt({
      iss: 'https://appleid.apple.com',
      sub: '000123.abc',
      email: 'abc123@privaterelay.appleid.com',
      email_verified: 'true',
      is_private_email: true,
      aud: 'com.stealf.app',
    });
    expect(decodeOidcEmail(token)).toBe('abc123@privaterelay.appleid.com');
  });

  it('returns undefined when the token has no email claim', () => {
    const token = makeJwt({
      iss: 'https://appleid.apple.com',
      sub: '000123.abc',
    });
    expect(decodeOidcEmail(token)).toBeUndefined();
  });

  it('returns undefined when the email claim is an empty string', () => {
    const token = makeJwt({ email: '' });
    expect(decodeOidcEmail(token)).toBeUndefined();
  });

  it('returns undefined when the email claim is not a string', () => {
    const token = makeJwt({ email: 12345 });
    expect(decodeOidcEmail(token)).toBeUndefined();
  });

  it('returns undefined for a malformed token (wrong number of parts)', () => {
    expect(decodeOidcEmail('not-a-jwt')).toBeUndefined();
    expect(decodeOidcEmail('only.two')).toBeUndefined();
  });

  it('returns undefined when the payload is not valid JSON', () => {
    const header = Buffer.from('{}').toString('base64url');
    const broken = Buffer.from('not json at all').toString('base64url');
    expect(decodeOidcEmail(`${header}.${broken}.sig`)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(decodeOidcEmail('')).toBeUndefined();
  });
});
