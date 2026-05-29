import { type AssetEntry } from './types';

export function hasVariants(
  entry: AssetEntry | Record<string, AssetEntry>,
): entry is Record<string, AssetEntry> {
  return typeof entry === 'object' && entry !== null && !('url' in entry);
}

export const ZK_ASSETS_BASE_URL =
  process.env.EXPO_PUBLIC_ZK_ASSETS_BASE_URL ||
  'https://zk.api.umbraprivacy.com';

export const ZK_MANIFEST_URL = `${ZK_ASSETS_BASE_URL}/manifest.json`;
export const ZK_ASSETS_DIRECTORY = 'zk-assets';
export const ZK_MANIFEST_FILENAME = 'manifest.json';

/**
 * Bumped whenever `@umbra-privacy/rn-zk-prover` is upgraded — its native
 * xcframework bakes in specific circuit binaries, and the CDN may have
 * served updated zkeys under the same manifest version since the device's
 * last download. Mismatch → on-device Rust panic during proof generation.
 *
 * Sentinel is stored in `LocalZkManifest.nativeCircuitVersion` and compared
 * by `validateManifestVersion`; mismatch triggers a full cache wipe.
 */
export const NATIVE_CIRCUIT_VERSION = 'rn-zk-prover-5.0.0';
