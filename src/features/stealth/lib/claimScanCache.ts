import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

const STORAGE_KEY_PREFIX = 'stealf.claim-scan.';
  
const SCHEMA_VERSION = 2;

export type ClaimScanCacheEntry = {
  schemaVersion: number;
  treeIndex: number;
  cursor: number;
  results: ClaimScanResult;
  scannedAt: number;
};


function bytesToHex(arr: Uint8Array): string {
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return { __bigint: value.toString() };
  }
  if (value instanceof Uint8Array) {
    return { __bytes: bytesToHex(value) };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      if (keys[0] === '__bigint' && typeof obj.__bigint === 'string') {
        return BigInt(obj.__bigint);
      }
      if (keys[0] === '__bytes' && typeof obj.__bytes === 'string') {
        return hexToBytes(obj.__bytes);
      }
    }
  }
  return value;
}

function keyFor(wallet: string): string {
  return STORAGE_KEY_PREFIX + wallet;
}

export async function loadClaimScanCache(
  wallet: string,
): Promise<ClaimScanCacheEntry | null> {
  if (!wallet) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviver) as ClaimScanCacheEntry;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch (err) {
    if (__DEV__) console.warn('[claim-scan-cache] load failed:', err);
    return null;
  }
}

export async function saveClaimScanCache(
  wallet: string,
  entry: Omit<ClaimScanCacheEntry, 'schemaVersion' | 'scannedAt'>,
): Promise<void> {
  if (!wallet) return;
  try {
    const full: ClaimScanCacheEntry = {
      schemaVersion: SCHEMA_VERSION,
      ...entry,
      scannedAt: Date.now(),
    };
    await AsyncStorage.setItem(keyFor(wallet), JSON.stringify(full, replacer));
  } catch (err) {
    if (__DEV__) console.warn('[claim-scan-cache] save failed:', err);
  }
}

export async function clearClaimScanCache(wallet: string): Promise<void> {
  if (!wallet) return;
  try {
    await AsyncStorage.removeItem(keyFor(wallet));
  } catch {
    // No-op: corruption / IO errors are non-fatal here, the next scan
    // will simply rebuild state from scratch.
  }
}
