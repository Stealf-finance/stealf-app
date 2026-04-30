import type {
  IZkProverForReceiverClaimableUtxo,
  IZkProverForSelfClaimableUtxo,
  ZkProverForReceiverClaimableUtxoFromPublicBalance,
  ZkProverForSelfClaimableUtxoFromPublicBalance,
} from '@umbra-privacy/sdk/interfaces';
import Zk from '@umbra-privacy/rn-zk-prover';
import { createZkProver } from './prover';
import { getZKey } from '../services/zkAssetService';

type ZkType = typeof Zk;

export function createCreateUtxoWithReceiverUnlockerZkProver(
  zkLib: ZkType = Zk,
): IZkProverForReceiverClaimableUtxo {
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getZKey('createDepositWithConfidentialAmount');
      const prover = createZkProver(zkeyPath, zkLib);
      return prover.prove(inputs);
    },
  };
}

export function createCreateUtxoWithEphemeralUnlockerZkProver(
  zkLib: ZkType = Zk,
): IZkProverForSelfClaimableUtxo {
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getZKey('createDepositWithConfidentialAmount');
      const prover = createZkProver(zkeyPath, zkLib);
      return prover.prove(inputs);
    },
  };
}

export function createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver(
  zkLib: ZkType = Zk,
): ZkProverForReceiverClaimableUtxoFromPublicBalance {
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getZKey('createDepositWithPublicAmount');
      const prover = createZkProver(zkeyPath, zkLib);
      return prover.prove(inputs);
    },
  };
}

// Self-claimable variant from public balance: same circuit (and zkey) as the
// receiver-claimable variant — only the unlocker branch differs and is wired
// SDK-side, not in the ZK proof. Used for Move flows that go through a
// self-claimable UTXO instead of a direct deposit/transfer.
export function createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver(
  zkLib: ZkType = Zk,
): ZkProverForSelfClaimableUtxoFromPublicBalance {
  return {
    prove: async (inputs: unknown) => {
      const zkeyPath = await getZKey('createDepositWithPublicAmount');
      const prover = createZkProver(zkeyPath, zkLib);
      return prover.prove(inputs);
    },
  };
}
