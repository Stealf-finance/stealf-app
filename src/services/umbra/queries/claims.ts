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

/** Raw 4-bucket result of a stealth-wallet UTXO scan, already filtered
 *  against the local "burnt" blacklist. Consumers slice this into UX-specific
 *  views (inbound to encrypted balance vs. self-burnable for cash). */
export type ClaimScanResult = {
  /** Encrypted balance: received from someone else's private send. */
  received: any[];
  /** Encrypted balance: created by a shield (bank → stealth) op. */
  publicReceived: any[];
  /** Self-claimable to a public address you control (typically bank). */
  selfBurnable: any[];
  /** Public variant of selfBurnable. */
  publicSelfBurnable: any[];
};

/**
 * Single scan call against the indexer. Heavy: derives stealth keys and
 * decrypts UTXO commitments on the JS thread. Run once and let consumers
 * slice the result via React Query `select` — see `useClaimScan`.
 */
export async function fetchClaimScan(): Promise<ClaimScanResult> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const notBurnt = (u: any) => !isBurnt(u);
  const out: ClaimScanResult = {
    received: (result.received ?? []).filter(notBurnt),
    publicReceived: (result.publicReceived ?? []).filter(notBurnt),
    selfBurnable: (result.selfBurnable ?? []).filter(notBurnt),
    publicSelfBurnable: (result.publicSelfBurnable ?? []).filter(notBurnt),
  };
  if (__DEV__) {
    console.log(
      '[claims] scan:' +
        ` received=${out.received.length}` +
        ` publicReceived=${out.publicReceived.length}` +
        ` selfBurnable=${out.selfBurnable.length}` +
        ` publicSelfBurnable=${out.publicSelfBurnable.length}`,
    );
  }
  return out;
}
