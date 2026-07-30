import {
  getReceiverBurnableStealthPoolNoteIntoETABurnerFunction,
  getSelfBurnableStealthPoolNoteIntoATABurnerFunction,
} from '@umbra-privacy/sdk/burn';
import { getBatchMerkleProofFetcher } from '@umbra-privacy/sdk';
import {
  createClaimReceiverZkProver,
  createClaimEphemeralZkProver,
} from '@/src/services/umbra/zk';
import { getStealthClient, getRelayer } from '../client';
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

async function burnEach(
  walletAddress: string,
  utxos: any[],
  makeBurner: (
    masterSeedSchemeId: string | undefined,
  ) => (notes: readonly any[]) => Promise<any>,
) {
  await ensureBlacklist(walletAddress);
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
  return burnEach(client.signer.address.toString(), utxos, (masterSeedSchemeId) =>
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
  return burnEach(client.signer.address.toString(), utxos, (masterSeedSchemeId) =>
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
