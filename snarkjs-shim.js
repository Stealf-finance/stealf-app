// snarkjs is an OPTIONAL peer dep of @umbra-privacy/sdk, used only by
// `infrastructure/zk-prover/proof-converter` for JS-side Groth16 proof
// generation. We never take that path — every proof in this app goes
// through `@umbra-privacy/rn-zk-prover` (native Rust via Mopro) — so we
// stub snarkjs with a throw-on-call to keep Metro's bundle resolvable
// without shipping the ~MB snarkjs runtime.

function notImplemented() {
  throw new Error(
    '[snarkjs-shim] snarkjs is not bundled. ZK proofs run via @umbra-privacy/rn-zk-prover.',
  );
}

module.exports = {
  wtns: { calculate: notImplemented },
  groth16: { prove: notImplemented, verify: notImplemented },
  zKey: { exportVerificationKey: notImplemented },
  default: undefined,
};
