import { type AssetEntry } from './types';

export function hasVariants(
  entry: AssetEntry | Record<string, AssetEntry>,
): entry is Record<string, AssetEntry> {
  return typeof entry === 'object' && entry !== null && !('url' in entry);
}

export const ZK_ASSETS_BASE_URL =
  process.env.EXPO_PUBLIC_ZK_ASSETS_BASE_URL ||
  'https://zk.api.umbraprivacy.com';

export const ZK_MANIFEST_URL = `${ZK_ASSETS_BASE_URL}/v5/manifest.json`;
export const ZK_ASSETS_DIRECTORY = 'zk-assets';
export const ZK_MANIFEST_FILENAME = 'manifest.json';

export const NATIVE_CIRCUIT_VERSION = 'rn-zk-prover-5.0.0+manifest-v5';

