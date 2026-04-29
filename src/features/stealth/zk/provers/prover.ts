import Zk, { ProofLib } from '@umbra-privacy/rn-zk-prover';
import { convertZkProofToBytes } from '../utils/proofConverter';
import { convertToMoproInputs } from '../utils/moproInputs';
import type { Groth16ProofBytes } from '../types';

type ZkType = typeof Zk;

export interface ZkProver {
  prove: (inputs: unknown) => Promise<Groth16ProofBytes>;
}

/**
 * Wrap a single zkey path into a `ZkProver` that calls the native Mopro
 * bridge, converts the resulting Groth16 proof into the byte layout the
 * Umbra SDK expects, and returns it.
 *
 * `zkLib` is exposed for tests so callers can inject a fake Mopro client.
 */
export function createZkProver(zkeyPath: string, zkLib: ZkType = Zk): ZkProver {
  return {
    prove: async (inputs: unknown) => {
      const path = zkeyPath.replace('file://', '');
      const moproInputs = convertToMoproInputs(
        inputs as Record<string, unknown>,
      );

      const proofResult = await zkLib.mopro_umbra_2.generateCircomProof(
        path,
        JSON.stringify(moproInputs),
        ProofLib.Arkworks,
      );

      const b = proofResult.proof.b;
      const bArray: [
        [string, string],
        [string, string],
        [string, string],
      ] = [
        [b.x[0], b.x[1]],
        [b.y[0], b.y[1]],
        [b.z[0], b.z[1]],
      ];

      return convertZkProofToBytes({
        a: Object.values(proofResult.proof.a),
        b: bArray,
        c: Object.values(proofResult.proof.c),
      });
    },
  };
}
