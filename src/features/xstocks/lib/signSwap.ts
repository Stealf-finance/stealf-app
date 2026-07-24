import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { getStealthKeypair } from '@/src/services/wallet/stealthKeypair';

/**
 * Sign a Jupiter swap — an unsigned versioned transaction (base64) from
 * build-buy/build-sell — with the stealth wallet's local ED25519 key, and
 * return the signed transaction as base64, ready for POST /execute. Signing is
 * local; never Turnkey (hard rule #3).
 */
export async function signSwapTransaction(unsignedBase64: string): Promise<string> {
  const keypair = await getStealthKeypair();
  const tx = VersionedTransaction.deserialize(Buffer.from(unsignedBase64, 'base64'));
  tx.sign([keypair]);
  return Buffer.from(tx.serialize()).toString('base64');
}
