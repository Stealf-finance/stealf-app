import {
  getReceiverBurnableStealthPoolNoteIntoETABurnerFunction,
  getSelfBurnableStealthPoolNoteIntoATABurnerFunction,
} from '@umbra-privacy/sdk/burn';
import { getBatchMerkleProofFetcher } from '@umbra-privacy/sdk';
import {
  createClaimReceiverZkProver,
  createClaimEphemeralZkProver,
} from '@/src/features/stealth/zk';
import {
  getStealthClient,
  getCachedSignerKey,
  getRelayer,
  INDEXER_API,
} from '../client';
import {
  loadBurntUtxosForCurrentWallet,
  isAlreadyBurntError,
  recoverFromAlreadyBurnt,
  handleClaimResult,
} from '@/src/features/stealth/lib/burntUtxos';

async function ensureBlacklist() {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
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
  apiEndpoint: INDEXER_API,
});

async function burnEach(
  utxos: any[],
  makeBurner: (
    masterSeedSchemeId: string | undefined,
  ) => (notes: readonly any[]) => Promise<any>,
) {
  await ensureBlacklist();
  let lastResult: unknown;
  for (const utxo of utxos) {
    const claimFn = makeBurner(utxo?.masterSeedSchemeId);
    try {
      const result = await claimFn([utxo]);
      lastResult = await handleClaimResult(result, [utxo]);
    } catch (err) {
      if (isAlreadyBurntError(err)) {
        lastResult = await recoverFromAlreadyBurnt([utxo]);
        continue;
      }
      throw err;
    }
  }
  return lastResult;
}

/** Claim received UTXOs into stealth's encrypted balance. */
export async function claimReceived(utxos: any[]) {
  const client = await getStealthClient();
  return burnEach(utxos, (masterSeedSchemeId) =>
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
  const client = await getStealthClient();
  return burnEach(utxos, (masterSeedSchemeId) =>
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
