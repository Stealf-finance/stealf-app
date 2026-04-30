import { getClaimableUtxoScannerFunction } from '@umbra-privacy/sdk';
import { getStealthClient, getCachedSignerKey } from '../client';
import {
  isBurnt,
  loadBurntUtxosForCurrentWallet,
} from '@/src/features/stealth/lib/burntUtxos';

async function ensureBlacklistLoaded(): Promise<void> {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
}

/**
 * UTXOs received by the current stealth wallet, claimable into encrypted balance.
 * Merges both the encrypted-balance bucket (`received`) and the public-balance
 * bucket (`publicReceived`) — the latter is what bank → shielded creates.
 */
export async function fetchPendingClaims(): Promise<any[]> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = [...(result.received ?? []), ...(result.publicReceived ?? [])];
  if (__DEV__) {
    console.log(
      '[claims] incoming scan: received=' +
        (result.received?.length ?? 0) +
        ' publicReceived=' +
        (result.publicReceived?.length ?? 0),
    );
  }
  return all.filter((u: any) => !isBurnt(u));
}

/**
 * Self-claimable UTXOs whose `destinationAddress` matches `bankWalletAddress`.
 * Merges encrypted-balance bucket (shielded → bank via `selfShield`) and
 * public-balance bucket (stealth → bank via the public-balance creator).
 */
export async function fetchPendingClaimsForCash(
  bankWalletAddress: string,
): Promise<any[]> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = [
    ...(result.selfBurnable ?? []),
    ...(result.publicSelfBurnable ?? []),
  ];
  if (__DEV__) {
    console.log(
      '[claims] coming scan: selfBurnable=' +
        (result.selfBurnable?.length ?? 0) +
        ' publicSelfBurnable=' +
        (result.publicSelfBurnable?.length ?? 0) +
        ' bankAddr=' +
        bankWalletAddress,
    );
  }
  return all.filter((u: any) => {
    if (isBurnt(u)) return false;
    const dest =
      u?.destinationAddress?.toString?.() ??
      String(u?.destinationAddress ?? '');
    return dest === bankWalletAddress;
  });
}
