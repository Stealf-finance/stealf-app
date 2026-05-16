import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
}));

vi.mock('../../env', () => ({
  getEnv: () => ({ EXPO_PUBLIC_SENTRY_DSN: undefined }),
}));

// eslint-disable-next-line import/first
import { __TEST_ONLY__ } from '../sentry';

const { scrubString, scrub } = __TEST_ONLY__;

describe('Sentry scrubber', () => {
  it('redacts JWT-shaped tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturepart_-';
    expect(scrubString(`token=${jwt}`)).toBe('token=[redacted:jwt]');
  });

  it('redacts email addresses', () => {
    expect(scrubString('reach me at alice@example.com today')).toBe(
      'reach me at [redacted:email] today',
    );
  });

  it('redacts bs58 Solana addresses (44 chars)', () => {
    const pk = '5tzFkiKscXHK5ZXCGbXbXFCpx8VKgF9z9Hphw1y3vN5T';
    expect(scrubString(`addr=${pk}`)).toBe('addr=[redacted:bs58]');
  });

  it('walks objects and arrays recursively', () => {
    const input = {
      user: { email: 'a@b.co' },
      tokens: ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig', 'safe'],
      n: 42,
    };
    const out = scrub(input);
    expect(out.user.email).toBe('[redacted:email]');
    expect(out.tokens[0]).toBe('[redacted:jwt]');
    expect(out.tokens[1]).toBe('safe');
    expect(out.n).toBe(42);
  });

  it('leaves clean strings untouched', () => {
    expect(scrubString('Auth flow finalized')).toBe('Auth flow finalized');
  });
});
