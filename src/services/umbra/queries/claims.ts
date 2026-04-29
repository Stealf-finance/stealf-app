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

/** UTXOs received by the current stealth wallet, claimable into encrypted balance. */
export async function fetchPendingClaims(): Promise<any[]> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.received ?? [];
  return all.filter((u: any) => !isBurnt(u));
}

/** Self-claimable UTXOs whose `destinationAddress` matches `bankWalletAddress`. */
export async function fetchPendingClaimsForCash(
  bankWalletAddress: string,
): Promise<any[]> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.selfBurnable ?? [];
  return all.filter((u: any) => {
    if (isBurnt(u)) return false;
    const dest =
      u?.destinationAddress?.toString?.() ??
      String(u?.destinationAddress ?? '');
    return dest === bankWalletAddress;
  });
}
