/* eslint-disable import/first -- vi.mock must precede module imports */
import { describe, expect, it, vi } from 'vitest';

// Mock the solana/kit wrapper before any module imports buildTransfer.
// We re-export the real @solana/kit primitives the builder needs (pipe,
// createTransactionMessage, etc.) and stub `getRpc()` to a deterministic
// mock so blockhash fetch + getAccountInfo are controlled per test.
const mockBlockhash = {
  blockhash: 'EeRiMS6Eg6kxYJYM7uG3J5hQKfwq9wQjLnpYU6n2sNzS' as const,
  lastValidBlockHeight: 100n,
};

let mockDestAtaExists = false;

vi.mock('@/src/services/env', () => ({
  getEnv: () => ({
    EXPO_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    EXPO_PUBLIC_SOLANA_WSS_URL: 'wss://api.devnet.solana.com',
  }),
}));

vi.mock('@/src/services/solana/kit', async () => {
  const actual = await vi.importActual<typeof import('@solana/kit')>('@solana/kit');
  return {
    ...actual,
    LAMPORTS_PER_SOL: 1_000_000_000,
    toAddress: actual.address,
    getRpc: () => ({
      getLatestBlockhash: () => ({
        send: async () => ({ value: mockBlockhash }),
      }),
      getAccountInfo: () => ({
        send: async () => ({ value: mockDestAtaExists ? { data: '' } : null }),
      }),
    }),
  };
});

import {
  buildSolTransferMessage,
  buildSplTransferMessage,
  encodeTransferLamports,
  isNativeSolMint,
  lamportsForSol,
} from '../lib/buildTransfer';
import { toRawAmount } from '../lib/amount';
import { SOL_MINT, USDC_MINT } from '@/src/constants/solana';

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SENDER = 'GZQq1jZHbeXzgRcj3kQy7L3W4DCm5tCJfBJaA3KePnvP';
const RECIPIENT = '7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7';

describe('lamportsForSol', () => {
  it('converts whole SOL to lamports', () => {
    expect(lamportsForSol(1)).toBe(1_000_000_000n);
  });

  it('rounds fractional lamports to floor', () => {
    expect(lamportsForSol(0.0000001)).toBe(100n);
  });

  it('rejects negative values', () => {
    expect(() => lamportsForSol(-1)).toThrow();
  });

  it('rejects NaN / Infinity', () => {
    expect(() => lamportsForSol(Number.NaN)).toThrow();
    expect(() => lamportsForSol(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('encodeTransferLamports', () => {
  it('produces a 12-byte buffer with instruction tag 2', () => {
    const out = encodeTransferLamports(123n);
    expect(out.byteLength).toBe(12);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(view.getUint32(0, true)).toBe(2);
    expect(view.getBigUint64(4, true)).toBe(123n);
  });
});

describe('isNativeSolMint', () => {
  it('returns true for null / undefined / SOL mint', () => {
    expect(isNativeSolMint(null)).toBe(true);
    expect(isNativeSolMint(undefined)).toBe(true);
    expect(isNativeSolMint(SOL_MINT)).toBe(true);
  });

  it('returns false for SPL mints', () => {
    expect(isNativeSolMint(USDC_MINT)).toBe(false);
  });
});

describe('buildSolTransferMessage', () => {
  it('uses the System program', async () => {
    const { message } = await buildSolTransferMessage({
      fromAddress: SENDER,
      toAddress: RECIPIENT,
      amountSol: 1,
    });
    expect(message.instructions).toHaveLength(1);
    expect(message.instructions[0].programAddress).toBe(SYSTEM_PROGRAM_ID);
  });
});

describe('buildSplTransferMessage', () => {
  it('rejects native-SOL mints', async () => {
    await expect(
      buildSplTransferMessage({
        fromAddress: SENDER,
        toAddress: RECIPIENT,
        mint: SOL_MINT,
        rawAmount: 1_000_000n,
        decimals: 6,
      }),
    ).rejects.toThrow(/native SOL/i);
  });

  it('emits a TransferChecked on the Token program when destination ATA exists', async () => {
    mockDestAtaExists = true;
    const { message, destAtaCreated } = await buildSplTransferMessage({
      fromAddress: SENDER,
      toAddress: RECIPIENT,
      mint: USDC_MINT,
      rawAmount: 5_000_000n,
      decimals: 6,
    });
    expect(destAtaCreated).toBe(false);
    expect(message.instructions).toHaveLength(1);
    const ix = message.instructions[0];
    expect(ix.programAddress).toBe(TOKEN_PROGRAM_ID);
    // TransferChecked discriminator is 12 (first byte of instruction data)
    expect(ix.data?.[0]).toBe(12);
  });

  it('prepends CreateAssociatedToken when destination ATA is missing', async () => {
    mockDestAtaExists = false;
    const { message, destAtaCreated } = await buildSplTransferMessage({
      fromAddress: SENDER,
      toAddress: RECIPIENT,
      mint: USDC_MINT,
      rawAmount: 5_000_000n,
      decimals: 6,
    });
    expect(destAtaCreated).toBe(true);
    expect(message.instructions).toHaveLength(2);
    // Associated-token program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
    expect(message.instructions[0].programAddress).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );
    expect(message.instructions[1].programAddress).toBe(TOKEN_PROGRAM_ID);
  });
});

describe('toRawAmount precision', () => {
  it('handles SOL decimals (9) for large balances without precision loss', () => {
    // 9.123456789 SOL → 9_123_456_789 lamports. Math.floor path drops the
    // last 1-2 digits at this magnitude; string-parsing must not.
    expect(toRawAmount(9.123456789, 9)).toBe(9_123_456_789n);
  });

  it('handles USDC decimals (6)', () => {
    expect(toRawAmount(1.5, 6)).toBe(1_500_000n);
    expect(toRawAmount(0.123456, 6)).toBe(123_456n);
  });

  it('rejects negative / NaN / Infinity', () => {
    expect(() => toRawAmount(-1, 6)).toThrow();
    expect(() => toRawAmount(Number.NaN, 6)).toThrow();
    expect(() => toRawAmount(Number.POSITIVE_INFINITY, 6)).toThrow();
  });

  it('rejects invalid decimals', () => {
    expect(() => toRawAmount(1, -1)).toThrow();
    expect(() => toRawAmount(1, 31)).toThrow();
    expect(() => toRawAmount(1, 1.5)).toThrow();
  });
});
