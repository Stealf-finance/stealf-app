import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { walletKeyCache } from '../cache/walletKeyCache';

/**
 * The stealth wallet's local ED25519 keypair (web3.js), from the private key in
 * SecureStore via `walletKeyCache`. This is the ONLY signing path for stealth
 * operations (hard rule #3 — never Turnkey). Used by jitoSOL staking and xStock
 * trades. Throws when the wallet isn't set up.
 */
export async function getStealthKeypair(): Promise<Keypair> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error('No wallet key — wallet setup required');
  }
  const keyBytes = bs58.decode(privateKeyB58);
  if (keyBytes.length === 64) return Keypair.fromSecretKey(keyBytes);
  if (keyBytes.length === 32) return Keypair.fromSeed(keyBytes);
  throw new Error(`Unexpected wallet key length: ${keyBytes.length}`);
}
