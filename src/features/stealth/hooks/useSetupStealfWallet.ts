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

export function useSetupStealfWallet() {
  const [loading, setLoading] = useState(false);

  const createWallet = async (): Promise<SetupResult> => {
    setLoading(true);
    try {
      const mnemonic = bip39.generateMnemonic(128);
      const { privateKey, address } = await deriveStealfKeypairFromMnemonic(mnemonic);
      const privateKeyB58 = bs58.encode(privateKey);
      await walletKeyCache.store(privateKeyB58, mnemonic);
      return { success: true, walletAddress: address, mnemonic };
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
    try {
      const { privateKey, address } = await deriveStealfKeypairFromMnemonic(mnemonic);
      const privateKeyB58 = bs58.encode(privateKey);
      await walletKeyCache.store(privateKeyB58, mnemonic);
      return { success: true, walletAddress: address };
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
