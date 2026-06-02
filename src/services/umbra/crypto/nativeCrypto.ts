import QuickCrypto from 'react-native-quick-crypto';
import { x25519 } from '@umbra-privacy/rn-quick-x25519';
import { getAesDecryptor } from '@umbra-privacy/sdk/crypto/aes';

/**
 * Native crypto deps for the Umbra burnable-note scanner.
 *
 * The SDK's defaults are pure-JS: AES-256-GCM via `@noble/ciphers` and X25519
 * via `@noble/curves`, both on the JS thread. A full merkle-tree rescan runs
 * x25519 + AES per leaf × scheme; in pure JS that blocks the UI for tens of
 * seconds. We swap in native backends:
 *   - AES  → `react-native-quick-crypto` (Nitro/JSI)
 *   - X25519 → `@umbra-privacy/rn-quick-x25519` (`scalarMultAsync`, runs on a
 *     background thread with zero-copy ArrayBuffer I/O)
 */

const AES_AUTH_TAG_LENGTH = 16;

/** X25519 base point (u = 9), 32 bytes little-endian (RFC 7748). */
const X25519_BASE_POINT: number[] = [9, ...new Array<number>(31).fill(0)];

/**
 * Raw AES-256-GCM decrypt primitive matching the SDK's
 * `AesGcmDecryptAsyncFunction` contract: `ciphertextWithAuthTag` is laid out as
 * `[ciphertext ‖ authTag]` (auth tag = last 16 bytes).
 */
async function nativeAesGcmDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertextWithAuthTag: Uint8Array,
): Promise<Uint8Array> {
  const splitAt = ciphertextWithAuthTag.length - AES_AUTH_TAG_LENGTH;
  const ciphertext = ciphertextWithAuthTag.subarray(0, splitAt);
  const authTag = ciphertextWithAuthTag.subarray(splitAt);

  const decipher = QuickCrypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key),
    Buffer.from(iv),
  );
  decipher.setAuthTag(Buffer.from(authTag) as never);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext)),
    decipher.final(),
  ]);
  return new Uint8Array(plaintext);
}

/** Native AES decryptor wired through the SDK's IV/auth-tag framing. */
export const nativeAesDecryptor = getAesDecryptor({
  aesGcmDecrypt: nativeAesGcmDecrypt,
});

/** Coerce a Uint8Array view into a tight ArrayBuffer (zero-copy when possible). */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return (
    u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength
      ? u8.buffer
      : u8.slice().buffer
  ) as ArrayBuffer;
}

/**
 * X25519 DH on a **background thread** with zero-copy `ArrayBuffer` I/O.
 *
 * `scalarMultAsync` offloads the curve mult off the JS thread and skips the
 * `number[]` ↔ C++ marshaling that makes the sync path ~3.4 ms/call. The SDK
 * scanner is patched to `await` this, so a full merkle-tree scan no longer
 * blocks the UI.
 */
export async function nativeX25519GetSharedSecretAsync(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Promise<Uint8Array> {
  const out = await x25519.scalarMultAsync(
    toArrayBuffer(privateKey),
    toArrayBuffer(publicKey),
  );
  return new Uint8Array(out);
}

/** X25519 public-key derivation: `scalar * basePoint`. Not on the scan hot path. */
export function nativeX25519GetPublicKey(privateKey: Uint8Array): Uint8Array {
  return Uint8Array.from(
    x25519.scalarMult(Array.from(privateKey), X25519_BASE_POINT),
  );
}
