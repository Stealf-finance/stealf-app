import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { walletKeyCache } from '../cache/walletKeyCache';

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
