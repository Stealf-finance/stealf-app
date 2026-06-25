import { describe, it, expect, vi } from 'vitest';
import { hashMessage, hashTypedData, serializeSignature } from 'viem';
import { signPortolaItem, type PortolaSignItem } from '../lib/portolaSigner';

const ADDR = '0x1234567890abcdef1234567890abcdef12345678';
// Deterministic 32-byte r / s components (value range is irrelevant here — we
// only assert the assembly, not on-chain validity).
const R = 'a'.repeat(64);
const S = 'b'.repeat(64);

function makeClient(v: string) {
  const calls: {
    signWith: string;
    payload: string;
    encoding: string;
    hashFunction: string;
  }[] = [];
  const client = {
    signRawPayload: vi.fn(async (input: typeof calls[number]) => {
      calls.push(input);
      return { activity: {}, r: R, s: S, v };
    }),
  };
  return {
    client: client as unknown as Parameters<typeof signPortolaItem>[1],
    calls,
  };
}

const TYPED_DATA = {
  domain: {
    name: 'USDC',
    version: '1',
    chainId: 84532,
    verifyingContract:
      '0x1111111111111111111111111111111111111111' as `0x${string}`,
  },
  types: {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
  primaryType: 'TransferWithAuthorization' as const,
  message: {
    from: ADDR,
    to: '0x2222222222222222222222222222222222222222',
    value: '1000000',
    validAfter: '0',
    validBefore: '1745812345',
    nonce: `0x${'a'.repeat(64)}`,
  },
};

describe('signPortolaItem — personal_sign', () => {
  it('hashes a utf-8 message (EIP-191) and signs the raw digest with NO_OP', async () => {
    const { client, calls } = makeClient('00');
    const item: PortolaSignItem = {
      method: 'personal_sign',
      address: ADDR,
      message: 'hello',
    };
    const sig = await signPortolaItem(item, client);

    expect(calls[0].payload).toBe(hashMessage('hello'));
    expect(calls[0].encoding).toBe('PAYLOAD_ENCODING_HEXADECIMAL');
    expect(calls[0].hashFunction).toBe('HASH_FUNCTION_NO_OP');
    expect(calls[0].signWith).toBe(ADDR);
    expect(sig).toBe(
      serializeSignature({ r: `0x${R}`, s: `0x${S}`, yParity: 0 }),
    );
  });

  it('treats a 0x-hex message as raw bytes', async () => {
    const { client, calls } = makeClient('00');
    await signPortolaItem(
      { method: 'personal_sign', address: ADDR, message: '0xdeadbeef' },
      client,
    );
    expect(calls[0].payload).toBe(hashMessage({ raw: '0xdeadbeef' }));
  });
});

describe('signPortolaItem — eth_signTypedData_v4', () => {
  it('hashes typed data (EIP-712) and assembles the signature', async () => {
    const { client, calls } = makeClient('01');
    const sig = await signPortolaItem(
      { method: 'eth_signTypedData_v4', address: ADDR, typedData: TYPED_DATA },
      client,
    );
    expect(calls[0].payload).toBe(hashTypedData(TYPED_DATA));
    expect(sig).toBe(
      serializeSignature({ r: `0x${R}`, s: `0x${S}`, yParity: 1 }),
    );
  });
});

describe('signPortolaItem — recovery id (v) handling', () => {
  it.each([
    ['00', 0],
    ['01', 1],
    ['1b', 0],
    ['1c', 1],
  ] as const)('v=%s → yParity %i', async (v, yParity) => {
    const { client } = makeClient(v);
    const sig = await signPortolaItem(
      { method: 'personal_sign', address: ADDR, message: 'x' },
      client,
    );
    expect(sig).toBe(serializeSignature({ r: `0x${R}`, s: `0x${S}`, yParity }));
  });
});
