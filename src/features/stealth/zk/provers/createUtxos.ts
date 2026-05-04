import type {
  IZkProverForReceiverClaimableUtxo,
  IZkProverForSelfClaimableUtxo,
  ZkProverForReceiverClaimableUtxoFromPublicBalance,
  ZkProverForSelfClaimableUtxoFromPublicBalance,
} from '@umbra-privacy/sdk/interfaces';
import Zk from '@umbra-privacy/rn-zk-prover';
import { createZkProver } from './prover';
import { getZKey } from '../services/zkAssetService';
import type { ZKeyType } from '../types';

type ZkType = typeof Zk;

/**
 * Build a `() => Promise<string>` that resolves a zkey path once and
 * reuses it for the lifetime of the closure. Failed resolutions clear
 * the cache so the next call retries — important for offline-first
 * recovery, otherwise a transient CDN failure would brick the prover.
 */
function memoizeZkeyPath(type: ZKeyType): () => Promise<string> {
  let cached: Promise<string> | null = null;
  return () => {
    if (cached) return cached;
    cached = getZKey(type).catch((err) => {
      cached = null;
      throw err;
    });
    return cached;
  };
}

export function createCreateUtxoWithReceiverUnlockerZkProver(
  zkLib: ZkType = Zk,
): IZkProverForReceiverClaimableUtxo {
  const getPath = memoizeZkeyPath('createDepositWithConfidentialAmount');
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getPath();
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}

export function createCreateUtxoWithEphemeralUnlockerZkProver(
  zkLib: ZkType = Zk,
): IZkProverForSelfClaimableUtxo {
  const getPath = memoizeZkeyPath('createDepositWithConfidentialAmount');
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getPath();
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}

export function createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver(
  zkLib: ZkType = Zk,
): ZkProverForReceiverClaimableUtxoFromPublicBalance {
  const getPath = memoizeZkeyPath('createDepositWithPublicAmount');
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getPath();
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}

export function createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver(
  zkLib: ZkType = Zk,
): ZkProverForSelfClaimableUtxoFromPublicBalance {
  const getPath = memoizeZkeyPath('createDepositWithPublicAmount');
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getPath();
      return createZkProver(zkeyPath, zkLib).prove(inputs);
    },
  };
}
