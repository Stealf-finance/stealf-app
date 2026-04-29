import { address, type Address } from '@solana/kit';
import {
  getTransactionEncoder,
  getTransactionDecoder,
} from '@solana/transactions';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type {
  IUmbraSigner,
  SignableTransaction,
} from '@umbra-privacy/sdk/interfaces';
import type { SignedTransaction } from '@umbra-privacy/sdk/types';

/**
 * Turnkey-backed implementation of `IUmbraSigner`.
 *
 * Umbra SDK normally expects a local-key signer (`createSignerFromPrivateKeyBytes`),
 * which is fine for the stealth wallet (we hold the key locally) but not for
 * the bank wallet — that one is custodied by Turnkey and we never see its
 * private key. This wrapper bridges Umbra's `IUmbraSigner` interface to
 * Turnkey's `signTransaction` API so we can build an `UmbraClient` whose fee
 * payer / signer is the bank wallet.
 *
 * Per signature:
 *   1. Umbra builds a `SignableTransaction` using OUR address as fee payer.
 *   2. We serialise it to Solana wire format (signatures map with null placeholder).
 *   3. We hand the hex bytes to Turnkey, which signs them remotely.
 *   4. We decode the response back into a `SignedTransaction` and return it.
 */

export type TurnkeyWalletAccount = {
  address: string;
  [k: string]: unknown;
};

export type TurnkeySignTransactionFn = (params: {
  walletAccount: TurnkeyWalletAccount;
  unsignedTransaction: string;
  transactionType: 'TRANSACTION_TYPE_SOLANA';
}) => Promise<string>;

export type TurnkeySignMessageFn = (params: {
  walletAccount: TurnkeyWalletAccount;
  message: string;
  encoding?: 'PAYLOAD_ENCODING_HEXADECIMAL' | 'PAYLOAD_ENCODING_TEXT_UTF8';
  hashFunction?:
    | 'HASH_FUNCTION_NO_OP'
    | 'HASH_FUNCTION_SHA256'
    | 'HASH_FUNCTION_KECCAK256'
    | 'HASH_FUNCTION_NOT_APPLICABLE';
  addEthereumPrefix?: boolean;
}) => Promise<{ r: string; s: string; v: string }>;

export interface CreateTurnkeyUmbraSignerArgs {
  walletAccount: TurnkeyWalletAccount;
  signTransaction: TurnkeySignTransactionFn;
  signMessage: TurnkeySignMessageFn;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error('TurnkeyUmbraSigner: signed tx hex has odd length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function createTurnkeyUmbraSigner(
  args: CreateTurnkeyUmbraSignerArgs,
): IUmbraSigner {
  const {
    walletAccount,
    signTransaction: turnkeySignTx,
    signMessage: turnkeySignMsg,
  } = args;
  const signerAddress: Address = address(walletAccount.address);
  const encoder = getTransactionEncoder();
  const decoder = getTransactionDecoder();

  const signOneTx = async (
    tx: SignableTransaction,
  ): Promise<SignedTransaction> => {
    const wireBytes = encoder.encode(tx) as Uint8Array;
    const unsignedHex = bytesToHex(wireBytes);

    const signedHex = await turnkeySignTx({
      walletAccount,
      unsignedTransaction: unsignedHex,
      transactionType: 'TRANSACTION_TYPE_SOLANA',
    });

    const signedBytes = hexToBytes(signedHex);
    const decoded = decoder.decode(signedBytes) as SignedTransaction & {
      lifetimeConstraint?: unknown;
    };
    // Wire format drops `lifetimeConstraint`. Spread instead of mutating to
    // avoid frozen-object issues in strict Hermes builds.
    return {
      ...decoded,
      lifetimeConstraint: (tx as { lifetimeConstraint?: unknown })
        .lifetimeConstraint,
    } as SignedTransaction;
  };

  const signOneMessage = async (message: Uint8Array) => {
    const messageHex = bytesToHex(message);
    const tkResult = await turnkeySignMsg({
      walletAccount,
      message: messageHex,
      encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
      hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
    });

    // Turnkey returns { r, s, v }. For Ed25519, r and s are each 32 bytes.
    // If Turnkey ever packs the full 64-byte sig in `r`, handle that too.
    const rBytes = hexToBytes(tkResult.r);
    const sBytes = hexToBytes(tkResult.s);
    const signature =
      rBytes.length === 64
        ? rBytes
        : (() => {
            const out = new Uint8Array(64);
            out.set(rBytes, 0);
            out.set(sBytes, 32);
            return out;
          })();

    if (__DEV__) {
      try {
        const pubkey = bs58.decode(walletAccount.address);
        const ok = nacl.sign.detached.verify(message, signature, pubkey);
        if (!ok) {
          console.warn(
            '[TurnkeyUmbraSigner] signMessage: nacl.verify failed — Turnkey may apply internal preprocessing. Proceeding anyway.',
          );
        }
      } catch (e) {
        console.warn('[TurnkeyUmbraSigner] signMessage: nacl.verify threw:', e);
      }
    }

    return {
      message,
      signature,
      signer: signerAddress,
    };
  };

  return {
    address: signerAddress,
    signTransaction: signOneTx,
    signTransactions: async (txs: readonly SignableTransaction[]) => {
      const out: SignedTransaction[] = [];
      for (const tx of txs) out.push(await signOneTx(tx));
      return out;
    },
    signMessage: signOneMessage,
  } as unknown as IUmbraSigner;
}
