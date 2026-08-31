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
 */
export function createZkProver(zkeyPath: string, zkLib: ZkType = Zk): ZkProver {
  return {
    prove: async (inputs: unknown) => {
      const path = zkeyPath.replace('file://', '');
      const moproInputs = convertToMoproInputs(
        inputs as Record<string, unknown>,
      );

      if (__DEV__) {
        const inputKeys = Object.keys(moproInputs);
        const fileExists = (() => {
          try {
            const stat = require('expo-file-system').default;
            return !!stat;
          } catch {
            return 'unknown';
          }
        })();
        console.log('[ZkProver] generateCircomProof start', {
          zkeyPath: path,
          fileExists,
          inputKeyCount: inputKeys.length,
          inputKeys,
          firstFewSamples: Object.fromEntries(
            inputKeys.slice(0, 5).map((k) => [k, moproInputs[k].slice(0, 2)]),
          ),
        });
      }

      let proofResult;
      try {
        proofResult = await zkLib.mopro.generateCircomProof(
          path,
          JSON.stringify(moproInputs),
          ProofLib.Arkworks,
        );
      } catch (err) {
        if (__DEV__) {
          const e = err as { message?: string; toString?: () => string };
          console.error('[ZkProver] generateCircomProof FAILED', {
            zkeyPath: path,
            errorMessage: e?.message,
            errorString: e?.toString?.(),
            errorJson: (() => {
              try {
                return JSON.stringify(err);
              } catch {
                return '[unserializable]';
              }
            })(),
            inputKeys: Object.keys(moproInputs),
          });
        }
        throw err;
      }

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
