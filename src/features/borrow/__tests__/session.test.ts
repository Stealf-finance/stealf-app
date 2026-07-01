import { describe, it, expect } from 'vitest';
import { PortolaSessionSchema } from '../api/session';

describe('PortolaSessionSchema', () => {
  it('parses a valid session response', () => {
    const parsed = PortolaSessionSchema.parse({
      sessionId: 'emb_3Qx7',
      embedUrl: 'https://embed.tryportola.com/?session=emb_3Qx7',
      expiresAt: '2026-06-03T12:34:56.789Z',
    });
    expect(parsed.sessionId).toBe('emb_3Qx7');
    expect(parsed.embedUrl).toContain('embed.tryportola.com');
  });

  it('rejects a non-URL embedUrl', () => {
    expect(() =>
      PortolaSessionSchema.parse({
        sessionId: 'emb_1',
        embedUrl: 'not-a-url',
        expiresAt: '2026-06-03T12:34:56.789Z',
      }),
    ).toThrow();
  });

  it('rejects when fields are missing', () => {
    expect(() => PortolaSessionSchema.parse({ sessionId: 'emb_1' })).toThrow();
  });
});
