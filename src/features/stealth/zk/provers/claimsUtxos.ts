import type {
  ClaimBatchSize,
  ClaimReceiverClaimableUtxoIntoEncryptedBalanceCircuitInputs,
  IZkProverForClaimReceiverClaimableUtxoIntoEncryptedBalance,
  IZkProverForClaimSelfClaimableUtxoIntoPublicBalance,
} from '@umbra-privacy/sdk/interfaces';
import Zk from '@umbra-privacy/rn-zk-prover';
import { createZkProver } from './prover';
import { getZKey } from '../services/zkAssetService';

type ZkType = typeof Zk;
type ClaimVariant = 'n1' | 'n2' | 'n3' | 'n4';

export function createClaimEphemeralZkProver(
  zkLib: ZkType = Zk,
): IZkProverForClaimSelfClaimableUtxoIntoPublicBalance {
  let cached: Promise<string> | null = null;
  const getPath = () => {
    if (cached) return cached;
    cached = getZKey('claimDepositIntoPublicAmount', 'n1').catch((err) => {
      cached = null;
      throw err;
    });
    return cached;
  };
  return {
    maxUtxoCapacity: 1,
    prove: async (inputs: unknown) => {
      const zkeyPath = await getPath();
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}

export function createClaimReceiverZkProver(
  zkLib: ZkType = Zk,
): IZkProverForClaimReceiverClaimableUtxoIntoEncryptedBalance {
  // Per-variant memoization. nLeaves can be 1-16 in the SDK type but
  // only 1-4 are produced as on-CDN circuits. Variants beyond 4 fall
  // through to getZKey, which throws — preserving the existing failure
  // mode without caching the rejection beyond the in-flight call.
  const cache: Partial<Record<ClaimVariant, Promise<string>>> = {};
  const getPath = (variant: ClaimVariant): Promise<string> => {
    const existing = cache[variant];
    if (existing) return existing;
    const promise = getZKey(
      'claimDepositIntoConfidentialAmount',
      variant,
    ).catch((err) => {
      delete cache[variant];
      throw err;
    });
    cache[variant] = promise;
    return promise;
  };
  return {
    prove: async (
      inputs: ClaimReceiverClaimableUtxoIntoEncryptedBalanceCircuitInputs,
      nLeaves: ClaimBatchSize = 1,
    ) => {
      if (nLeaves < 1 || nLeaves > 16) {
        throw new Error('Invalid number of leaves');
      }
      const zkeyPath = await getPath(`n${nLeaves}` as ClaimVariant);
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}
