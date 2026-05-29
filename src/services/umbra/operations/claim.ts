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

// The v5 burner deps want `submitBurn` / `pollBurnStatus`, but `UmbraRelayer`
// exposes the same underlying functions as `submitClaim` / `pollClaimStatus`.
// Build the structural shim once at module load (the relayer itself is
// memoized inside `getRelayer`).
function getBurnRelayer() {
  const relayer = getRelayer();
  return {
    submitBurn: relayer.submitClaim,
    pollBurnStatus: relayer.pollClaimStatus,
    // v5 burner deps need an explicit fee-payer accessor; `UmbraRelayer`
    // exposes the same address as `getFeePayer()`.
    getRelayerAddress: relayer.getFeePayer,
  };
}

// Shared across burner calls — fetcher is stateless beyond its endpoint.
const fetchBatchMerkleProof = getBatchMerkleProofFetcher({
  apiEndpoint: INDEXER_API,
});

/** Claim received UTXOs into stealth's encrypted balance. */
export async function claimReceived(utxos: any[]) {
  const client = await getStealthClient();
  const claimFn = getReceiverBurnableStealthPoolNoteIntoETABurnerFunction(
    { client },
    {
      zkProver: createClaimReceiverZkProver(),
      relayer: getBurnRelayer(),
      fetchBatchMerkleProof,
    },
  );

  await ensureBlacklist();

  let result;
  try {
    result = await claimFn(utxos);
  } catch (err) {
    if (isAlreadyBurntError(err)) return recoverFromAlreadyBurnt(utxos);
    throw err;
  }
  return handleClaimResult(result, utxos);
}

/** Claim self-burnable UTXOs to their destination's public ATA (via relayer). */
export async function claimSelfToPublic(utxos: any[]) {
  const client = await getStealthClient();
  const claimFn = getSelfBurnableStealthPoolNoteIntoATABurnerFunction(
    { client },
    {
      zkProver: createClaimEphemeralZkProver(),
      relayer: getBurnRelayer(),
      fetchBatchMerkleProof,
    },
  );

  await ensureBlacklist();

  let result;
  try {
    result = await claimFn(utxos);
  } catch (err) {
    if (isAlreadyBurntError(err)) return recoverFromAlreadyBurnt(utxos);
    throw err;
  }
  return handleClaimResult(result, utxos);
}
