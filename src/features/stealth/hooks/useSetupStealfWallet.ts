import { useState } from 'react';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { deriveStealfKeypairFromMnemonic } from '@/src/services/solana/keyDerivation';

export interface SetupResult {
  success: boolean;
  walletAddress?: string;
  mnemonic?: string;
  error?: string;
}

// Local key derivation can finish in <500ms which makes the loader flash by.
// Hold the loader visible long enough that the create/import action feels
// intentional rather than instant.
const MIN_LOADER_MS = 1500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function withMinDuration<T>(work: Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await work;
  const elapsed = Date.now() - start;
  if (elapsed < MIN_LOADER_MS) await sleep(MIN_LOADER_MS - elapsed);
  return result;
}

export function useSetupStealfWallet() {
  const [loading, setLoading] = useState(false);

  const createWallet = async (): Promise<SetupResult> => {
    setLoading(true);
    // Yield so React commits the loading state and the overlay paints before
    // the synchronous BIP39 work blocks the JS thread.
    await sleep(0);
    try {
      return await withMinDuration(
        (async () => {
          const mnemonic = bip39.generateMnemonic(128);
          const { privateKey, address } = await deriveStealfKeypairFromMnemonic(mnemonic);
          const privateKeyB58 = bs58.encode(privateKey);
          await walletKeyCache.store(privateKeyB58, mnemonic);
          return { success: true, walletAddress: address, mnemonic } as SetupResult;
        })(),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create wallet';
      if (__DEV__) console.error('[useSetupStealfWallet] create failed:', msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (mnemonic: string): Promise<SetupResult> => {
    setLoading(true);
    await sleep(0);
    try {
      return await withMinDuration(
        (async () => {
          const { privateKey, address } = await deriveStealfKeypairFromMnemonic(mnemonic);
          const privateKeyB58 = bs58.encode(privateKey);
          await walletKeyCache.store(privateKeyB58, mnemonic);
          return { success: true, walletAddress: address } as SetupResult;
        })(),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import wallet';
      if (__DEV__) console.error('[useSetupStealfWallet] import failed:', msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return { createWallet, importWallet, loading };
}
