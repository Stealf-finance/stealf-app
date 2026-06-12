import {
  createKeyPairFromBytes,
  createKeyPairFromPrivateKeyBytes,
  getAddressFromPublicKey,
} from '@solana/kit';
import type { Address } from '@solana/kit';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';

const HARDENED_OFFSET = 0x80000000;

// SLIP-0010 master key derivation uses the literal ASCII "ed25519 seed" as
// HMAC key. @noble/hashes v2 requires Uint8Array; v1 accepted strings.
const ED25519_SEED_KEY = new TextEncoder().encode('ed25519 seed');

export const SOLANA_BIP44_PATH = "m/44'/501'/0'/0'";

export function derivePath(
  path: string,
  seed: Uint8Array,
): { key: Uint8Array } {
  const I = hmac(sha512, ED25519_SEED_KEY, seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  const segments = path.split('/').slice(1);
  for (const segment of segments) {
    const isHardened = segment.endsWith("'");
    const index = parseInt(isHardened ? segment.slice(0, -1) : segment, 10);
    const hardenedIndex = isHardened ? index + HARDENED_OFFSET : index;

    const data = new Uint8Array(1 + 32 + 4);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, hardenedIndex, false);

    const child = hmac(sha512, chainCode, data);
    key = child.slice(0, 32);
    chainCode = child.slice(32);
  }

  return { key };
}

export async function deriveStealfKeypairFromMnemonic(
  mnemonic: string,
): Promise<{ privateKey: Uint8Array; address: Address }> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const { key } = derivePath(SOLANA_BIP44_PATH, new Uint8Array(seed));
  if (key.length !== 32) {
    throw new Error('Derivation failed: invalid derived key');
  }
  const signer = await createKeyPairFromPrivateKeyBytes(key);
  const address = await getAddressFromPublicKey(signer.publicKey);
  return { privateKey: key, address };
}

export async function getStealfKeypair(): Promise<CryptoKeyPair> {
  const storedKey = await walletKeyCache.getPrivateKey();
  if (storedKey) {
    const decoded = bs58.decode(storedKey);
    if (decoded.length === 64) {
      return await createKeyPairFromBytes(decoded);
    }
    return await createKeyPairFromPrivateKeyBytes(decoded);
  }
  const storedMnemonic = walletKeyCache.getMnemonic();
  if (storedMnemonic) {
    const { privateKey } = await deriveStealfKeypairFromMnemonic(storedMnemonic);
    return await createKeyPairFromPrivateKeyBytes(privateKey);
  }
  throw new Error('No wallet key found');
}

export async function getStealfAddress(): Promise<Address> {
  const keyPair = await getStealfKeypair();
  return await getAddressFromPublicKey(keyPair.publicKey);
}
