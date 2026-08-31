import { createSignerFromPrivateKeyBytes, type IUmbraSigner } from '@umbra-privacy/sdk';
import bs58 from 'bs58';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';

export async function getLocaleSigner(): Promise<IUmbraSigner> {
  const pk = await walletKeyCache.getPrivateKey();
  if (!pk) throw new Error('No wallet key — wallet setup required');
  return createSignerFromPrivateKeyBytes(bs58.decode(pk));
}
