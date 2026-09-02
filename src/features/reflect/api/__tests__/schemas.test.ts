import { describe, expect, it } from 'vitest';
import { UnsignedReflectTxSchema } from '../reflect';

const valid = {
  unsignedTransactionBase64: 'AQAB',
  expectedReceivedBaseUnits: 48_720_000,
  minimumReceivedBaseUnits: 48_000_000,
  rate: 1.026,
  slippageBps: 50,
  signer: '8xK4wYq2mNvR3pLtJ5sD7fH1gB9cE6aZ4nQ8rT2uV3wF',
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=k',
};

describe('UnsignedReflectTxSchema', () => {
  it('accepts a well-formed build response', () => {
    expect(UnsignedReflectTxSchema.parse(valid).rpcUrl).toBe(valid.rpcUrl);
  });

  // A blank rpcUrl reaches Turnkey's signAndSendTransaction and surfaces as
  // "Transaction simulation failed" — a misconfigured server should fail here,
  // at the IO boundary, where the message still names the cause.
  it('rejects an empty rpcUrl', () => {
    expect(() => UnsignedReflectTxSchema.parse({ ...valid, rpcUrl: '' })).toThrow();
  });

  it('rejects a non-http rpcUrl', () => {
    expect(() =>
      UnsignedReflectTxSchema.parse({ ...valid, rpcUrl: 'wss://rpc.example.com' }),
    ).toThrow();
  });
});
