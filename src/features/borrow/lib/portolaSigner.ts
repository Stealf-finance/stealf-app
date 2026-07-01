/**
 * Portola EVM signer.
 *
 * Portola posts `sign` items (personal_sign / eth_signTypedData_v4) that must be
 * signed by the borrower's EVM wallet. Stealf signs via Turnkey:
 *   1. compute the EIP-191 / EIP-712 digest with viem,
 *   2. sign the raw 32-byte digest with Turnkey (`signRawPayload`, secp256k1,
 *      HASH_FUNCTION_NO_OP since we pre-hashed),
 *   3. assemble the 65-byte `0x` Ethereum signature (r ++ s ++ v).
 *
 * ⚠️ Crypto path — verify on-device before trusting (digest/recovery-id
 * assembly can't be proven by the type-checker). For typed data we pass
 * `item.typedData` through unchanged; it must carry its EIP-712 `types`.
 */
import {
  hashMessage,
  hashTypedData,
  serializeSignature,
  type Hex,
  type TypedDataDefinition,
} from 'viem';
import type { useTurnkey } from '@turnkey/react-native-wallet-kit';

type HttpClient = NonNullable<ReturnType<typeof useTurnkey>['httpClient']>;

export type PortolaSignItem =
  | { method: 'personal_sign'; address: string; message: string }
  | { method: 'eth_signTypedData_v4'; address: string; typedData: unknown };

function asHex(s: string): Hex {
  return (s.startsWith('0x') ? s : `0x${s}`) as Hex;
}

export async function signPortolaItem(
  item: PortolaSignItem,
  httpClient: HttpClient,
): Promise<Hex> {
  // 1. Digest. personal_sign mirrors EIP-1193 semantics: a 0x-hex message is
  //    treated as raw bytes, otherwise as utf-8.
  const digest: Hex =
    item.method === 'personal_sign'
      ? hashMessage(
          item.message.startsWith('0x')
            ? { raw: item.message as Hex }
            : item.message,
        )
      : hashTypedData(item.typedData as TypedDataDefinition);

  // 2. Sign the raw digest with Turnkey (no further hashing).
  const { r, s, v } = await httpClient.signRawPayload({
    signWith: item.address,
    payload: digest,
    encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
    hashFunction: 'HASH_FUNCTION_NO_OP',
  });

  // 3. Assemble. Turnkey returns v as the recovery id ("00"/"01"); tolerate the
  //    27/28 form too.
  const vNum = parseInt(v, 16);
  const yParity = vNum >= 27 ? vNum - 27 : vNum;
  return serializeSignature({ r: asHex(r), s: asHex(s), yParity });
}
