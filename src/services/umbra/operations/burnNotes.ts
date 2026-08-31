import {
  getReceiverBurnableStealthPoolNoteIntoETABurnerFunction,
  getSelfBurnableStealthPoolNoteIntoATABurnerFunction,
} from '@umbra-privacy/sdk/burn';
import { getBatchMerkleProofFetcher } from '@umbra-privacy/sdk';
import {
  createClaimReceiverZkProver,
  createClaimEphemeralZkProver,
} from '@/src/services/umbra/zk';
import { getActiveClient, getRelayer } from '../client';
import {
  loadBurntUtxosForCurrentWallet,
  isAlreadyBurntError,
  recoverFromAlreadyBurnt,
  handleClaimResult,
} from '@/src/services/umbra/burntUtxos';
import { UMBRA_CONFIG } from '../constant';

async function ensureBlacklist(walletAddress: string) {
  await loadBurntUtxosForCurrentWallet(walletAddress);
}

function getBurnRelayer() {
  const relayer = getRelayer();
  return {
    submitBurn: relayer.submitClaim,
    pollBurnStatus: relayer.pollClaimStatus,
    getRelayerAddress: relayer.getFeePayer,
  };
}

const fetchBatchMerkleProof = getBatchMerkleProofFetcher({
  apiEndpoint: UMBRA_CONFIG.indexerApi,
});

const RECEIVER_BATCH_SIZE = 5;
const SELF_BATCH_SIZE = 1;

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function groupBySchemeId(utxos: any[]): Map<string | undefined, any[]> {
  const groups = new Map<string | undefined, any[]>();
  for (const u of utxos) {
    const key = u?.masterSeedSchemeId as string | undefined;
    const g = groups.get(key);
    if (g) g.push(u);
    else groups.set(key, [u]);
  }
  return groups;
}

async function burnBatch(
  claimFn: (notes: readonly any[]) => Promise<any>,
  notes: any[],
): Promise<unknown> {
  try {
    const result = await claimFn(notes);
    return await handleClaimResult(result, notes);
  } catch (err) {
    if (!isAlreadyBurntError(err)) throw err;
    if (notes.length === 1) return recoverFromAlreadyBurnt(notes);
    let last: unknown;
    for (const n of notes) last = await burnBatch(claimFn, [n]);
    return last;
  }
}

async function burnEach(
  walletAddress: string,
  utxos: any[],
  batchSize: number,
  makeBurner: (
    masterSeedSchemeId: string | undefined,
  ) => (notes: readonly any[]) => Promise<any>,
) {
  await ensureBlacklist(walletAddress);
  let lastResult: unknown;
  for (const [schemeId, group] of groupBySchemeId(utxos)) {
    const claimFn = makeBurner(schemeId);
    for (const notes of chunk(group, batchSize)) {
      lastResult = await burnBatch(claimFn, notes);
    }
  }
  return lastResult;
}

/** Claim received UTXOs into the wallet's encrypted balance. */
export async function claimReceived(utxos: any[]) {
  const client = await getActiveClient();
  return burnEach(
    client.signer.address.toString(),
    utxos,
    RECEIVER_BATCH_SIZE,
    (masterSeedSchemeId: string | undefined) =>
      getReceiverBurnableStealthPoolNoteIntoETABurnerFunction(
      { client, masterSeedSchemeId } as never,
      {
        zkProver: createClaimReceiverZkProver(),
        relayer: getBurnRelayer(),
        fetchBatchMerkleProof,
        pollingIntervalMs: 500,
      },
    ),
  );
}

/** Claim self-burnable UTXOs to their destination's public ATA (via relayer). */
export async function claimSelfToPublic(utxos: any[]) {
  const client = await getActiveClient();
  return burnEach(
    client.signer.address.toString(),
    utxos,
    SELF_BATCH_SIZE,
    (masterSeedSchemeId: string | undefined) =>
      getSelfBurnableStealthPoolNoteIntoATABurnerFunction(
      { client, masterSeedSchemeId } as never,
      {
        zkProver: createClaimEphemeralZkProver(),
        relayer: getBurnRelayer(),
        fetchBatchMerkleProof,
        pollingIntervalMs: 500,
      },
    ),
  );
}
