import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Vitest runs from the repo root; fail loudly rather than silently skip if not.
const dist = path.resolve(process.cwd(), 'node_modules/@umbra-privacy/sdk/dist');
if (!existsSync(dist)) throw new Error(`SDK dist not found at ${dist}`);
const require = createRequire(path.join(dist, 'anchor.cjs'));

// Both builds ship the guard, and metro.config.js bundles the ESM one for the
// transfer subpath while the main entry resolves to the CJS one.
const BUILDS = {
  esm: 'chunk-XVUENWGB.js',
  cjs: 'chunk-TQHVA67D.cjs',
} as const;

const KEY = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const ZEROS = new Uint8Array(32);

function decodersFor(utilityPubkeys: unknown) {
  return { decodeMXEAccount: () => ({ exists: true, data: { utilityPubkeys } }) };
}

const ACCOUNT = { exists: true };

describe.each(Object.entries(BUILDS))(
  'extractMxeX25519PublicKeyFromMxeAccount — %s build',
  (_label, file) => {
    const { extractMxeX25519PublicKeyFromMxeAccount } = require(
      path.join(dist, file),
    );

    it('accepts Unset when the variant still carries a key — devnet today', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const out = extractMxeX25519PublicKeyFromMxeAccount(
        ACCOUNT,
        decodersFor({ __kind: 'Unset', fields: [{ x25519Pubkey: KEY }, [true, true]] }),
      );
      expect(Array.from(out as Uint8Array)).toEqual(Array.from(KEY));
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it('reads a Set variant without warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const out = extractMxeX25519PublicKeyFromMxeAccount(
        ACCOUNT,
        decodersFor({ __kind: 'Set', fields: [{ x25519Pubkey: KEY }] }),
      );
      expect(Array.from(out as Uint8Array)).toEqual(Array.from(KEY));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('still throws on 32 zero bytes — an empty key is not a key', () => {
      expect(() =>
        extractMxeX25519PublicKeyFromMxeAccount(
          ACCOUNT,
          decodersFor({ __kind: 'Unset', fields: [{ x25519Pubkey: ZEROS }, []] }),
        ),
      ).toThrow(/utility pubkeys/i);
    });

    it('still throws when the variant carries no key at all', () => {
      expect(() =>
        extractMxeX25519PublicKeyFromMxeAccount(
          ACCOUNT,
          decodersFor({ __kind: 'Unset', fields: [] }),
        ),
      ).toThrow(/utility pubkeys/i);
    });
  },
);

// The compute-budget hunk lives inside a non-exported submit helper, so this is
// a presence check on the built files, not a behavioural one.
describe('transfer compute-unit limit patch', () => {
  const BUILDS = ['index.js', 'index.cjs'];
  const SOLANA_DEFAULT_CU = 200_000;
  const SOLANA_MAX_CU = 1_400_000;

  it.each(BUILDS)('%s prepends a ComputeBudget instruction to the transfer', (file) => {
    const src = readFileSync(path.join(dist, 'operations/transfer', file), 'utf8');
    expect(src).toContain('ComputeBudget111111111111111111111111111111');
    expect(src).toMatch(
      /instructions:\s*\[\s*stealfComputeUnitLimitInstruction\(\s*STEALF_TRANSFER_COMPUTE_UNIT_LIMIT\s*\),\s*data\.instruction\s*\]/,
    );
  });

  it.each(BUILDS)('%s asks for more than the default and less than the cap', (file) => {
    const src = readFileSync(path.join(dist, 'operations/transfer', file), 'utf8');
    const limit = Number(
      /var STEALF_TRANSFER_COMPUTE_UNIT_LIMIT = (\d+);/.exec(src)?.[1],
    );
    expect(limit).toBeGreaterThan(SOLANA_DEFAULT_CU);
    expect(limit).toBeLessThanOrEqual(SOLANA_MAX_CU);
  });
});
