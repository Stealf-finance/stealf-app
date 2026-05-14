import type { ImageSource } from 'expo-image';
import { useEffect, useState } from 'react';

export type SelectedAsset = {
  mint: string;
  symbol: string;
  decimals: number;
  iconSource?: ImageSource | number;
  iconUri?: string;
  balance: number;
  balanceUSD: number;
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
