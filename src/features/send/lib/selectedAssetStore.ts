import { useEffect, useState } from 'react';

export type SelectedAsset = {
  mint: string;
  symbol: string;
  decimals: number;
  /** Local bundle icon (require'd PNG) if available — wins over iconUri. */
  iconSource?: number;
  /** Remote icon URL from on-chain metadata (Helius DAS). */
  iconUri?: string;
  /** Public balance in token units (already humanized, not raw lamports). */
  balance: number;
  balanceUSD: number;
  /** USD price per token unit. */
  price: number;
};

let current: SelectedAsset | null = null;
const listeners = new Set<() => void>();

export function setSelectedAsset(asset: SelectedAsset | null): void {
  current = asset;
  listeners.forEach((l) => l());
}

export function getSelectedAsset(): SelectedAsset | null {
  return current;
}

export function useSelectedAsset(): SelectedAsset | null {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current;
}
