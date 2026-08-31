import { address, type Address } from '@solana/kit';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import {
  getTransactionEncoder,
  getTransactionDecoder,
} from '@solana/transactions';
import type { IUmbraSigner, SignableTransaction } from '@umbra-privacy/sdk';
import type { SignedTransaction } from '@umbra-privacy/sdk/types';


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

const encoder = getTransactionEncoder();
const decoder = getTransactionDecoder();

export async function signTx(
  tx: SignableTransaction,
  walletAccount: TurnkeyWalletAccount,
  turnkeySignTx: TurnkeySignTransactionFn,
): Promise<SignedTransaction> {
  const unsignedHex = bytesToHex(encoder.encode(tx) as Uint8Array);

  const signedHex = await turnkeySignTx({
    walletAccount,
    unsignedTransaction: unsignedHex,
    transactionType: 'TRANSACTION_TYPE_SOLANA',
  });

  const decoded = decoder.decode(hexToBytes(signedHex)) as SignedTransaction;

  return {
    ...decoded,
    lifetimeConstraint: (tx as { lifetimeConstraint?: unknown })
      .lifetimeConstraint,
  } as SignedTransaction;
}

export async function signMessage(
  message: Uint8Array,
  walletAccount: TurnkeyWalletAccount,
  signerAddress: Address,
  turnkeySignMsg: TurnkeySignMessageFn,
) {
  const { r, s } = await turnkeySignMsg({
    walletAccount,
    message: bytesToHex(message),
    encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
    hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
  });

  const rBytes = hexToBytes(r);
  const signature =
    rBytes.length === 64
      ? rBytes
      : (() => {
          const out = new Uint8Array(64);
          out.set(rBytes, 0);
          out.set(hexToBytes(s), 32);
          return out;
        })();

  return { message, signature, signer: signerAddress };
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

  return {
    address: signerAddress,
    signTransaction: (tx: SignableTransaction) =>
      signTx(tx, walletAccount, turnkeySignTx),
    signTransactions: async (txs: readonly SignableTransaction[]) => {
      const out: SignedTransaction[] = [];
      for (const tx of txs) {
        out.push(await signTx(tx, walletAccount, turnkeySignTx));
      }
      return out;
    },
    signMessage: (msg: Uint8Array) =>
      signMessage(msg, walletAccount, signerAddress, turnkeySignMsg),
  } as unknown as IUmbraSigner;
}
