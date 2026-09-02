# Umbra confidential transfers stall on devnet — investigation report

**Date:** 2026-09-02 · **Network:** Solana devnet · **SDK:** `@umbra-privacy/sdk@5.0.0-rc.4`

## Summary

A `shared → shared` confidential transfer reaches the chain and succeeds as a
transaction, but the Arcium MPC computation behind it is never executed. No
`CallbackComputation` fires, no balance moves, and the SDK reports the transfer
as a success.

Deposits on the same wallet, same cluster, same session settle in about two
seconds. The failure is specific to the transfer computation definitions.

Three client-side defects had to be fixed before reaching this point; they are
documented below because they are SDK issues, not integration mistakes. The
remaining blocker is not in the client.

## Addresses

| Role                           | Address                                              |
| ------------------------------ | ---------------------------------------------------- |
| Umbra program (devnet)         | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ`       |
| Arcium program                 | `Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ`       |
| MXE account                    | `9AutF4oqBAoV1AGXvtco4BJ9JUrA3q3gLMu5iSvWw1Pk`       |
| Cluster (offset 456)           | `DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95`       |
| Sender wallet                  | `3kKjPKLCVqDuxAGBvTFPzrZobzAYwm3uAjh9H1We8wyR`       |
| Sender ETA (wSOL)              | `2poqYiw7rJEPSkimvEwLDCYpQ6ek4vAUb9bUUpqx8f7a`       |
| Receiver wallet (our treasury) | `FpRVZrZ7zAigWG4mGMirCJMibxedQ4DmMcQCo3p94nwF`       |
| Receiver ETA (wSOL)            | `9xJATkMDjcPJZDN5mBjzRU4JeUbuXW1cnMvh1tZFwg1c`       |
| Mint                           | `So11111111111111111111111111111111111111112` (wSOL) |

Instruction: `TransferFromSharedBalanceToNewSharedBalanceV18`.

## Symptom

The queue transaction lands and succeeds. Then nothing happens.

```
ETA sender    2poqYiw…8f7a   queuedComputationCount = 8
                             oldestPendingSlot      = 491951107   (~36 min at slot 491956516)
                             generationIndex        = 19
                             statusBits             = 63

ETA receiver  9xJATkM…wg1c   queuedComputationCount = 0
                             generationIndex        = 0
                             statusBits             = 7
```

Eight computations are queued on the sender and none has executed. The
receiver's account has never been touched — `generationIndex` is still 0, which
is also why every attempt re-selects the `_to_new_shared` variant rather than
`_to_existing_shared`.

The sender's `generationIndex` did move from 15 to 19 during the session. Those
were deposits, not transfers.

## The cluster is alive

This is what rules out the obvious explanation:

```
11:19:36  DepositFromPublicBalanceIntoNewSharedBalanceV18   259 561 CU
11:19:38  CallbackComputation                               198 375 CU
```

Deposits settle in about two seconds, and cluster nodes do fire callbacks. The
cluster account confirms it:

```
DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95
  clusterSize      = 2
  activation       = { activationEpoch: 0, deactivationEpoch: 18446744073709551615 }
  nodes            = 2      pendingNodes = 0
  lastUpdatedEpoch = 460
  maxCapacity      = 0
```

## Ruled out

- **Cluster inactive** — activated at epoch 0, never deactivated, two nodes, no
  pending nodes.
- **Missing computation definitions** — all three accounts exist on-chain
  (see the table below).
- **Receiver not registered** — the selected variant is `_to_new_**shared**`,
  and the `shared` half of that name means the receiver's user account already
  has `STATUS_BIT_X25519_TOKEN_KEY_REGISTERED`.
- **Unsupported mint** — the docs give the V18 mint list as "wSOL only on
  devnet", and wSOL is exactly what we send.
- **Solana compute budget** — fixed on our side; the queue transaction now
  consumes 218k–242k CU and succeeds.

## Open hypothesis 1 — the MXE has no published utility pubkeys

```
9AutF4oqBAoV1AGXvtco4BJ9JUrA3q3gLMu5iSvWw1Pk
  status                 = Active (0)
  cluster                = Some(456)
  computationDefinitions = 182
  utilityPubkeys.__kind  = "Unset"
  utilityPubkeys.fields  = [ { x25519Pubkey: … }, [true, true] ]
```

The enum sits on `Unset`, but the variant still carries a valid x25519 key. That
key is **byte-for-byte identical** to the `mxePubkey` the SDK ships in its own
devnet network config:

```
on-chain : a174457b3eeda2517f24bac800e3a1bd4f1e22f4e2fffce4688df05553c7ad07
sdk config: a174457b3eeda2517f24bac800e3a1bd4f1e22f4e2fffce4688df05553c7ad07
```

The decode is faithful: re-encoding the decoded account reproduces the raw
bytes, and the enum tag byte on-chain is literally `1` (the second variant).
There are 16 trailing bytes the `arcium-codama` IDL does not model, so a
variant-order drift between the IDL and the deployed program cannot be entirely
excluded.

**Question for Umbra:** should the devnet MXE's `utilityPubkeys` be `Set`, and
does `Unset` prevent cluster nodes from executing transfer computations?

## Open hypothesis 2 — the computation is queued with a zero ACU bid

All three computation definitions exist, but they are not priced alike:

| Computation definition                                        |    `cuAmount` | `circuitLen` | Executes  |
| ------------------------------------------------------------- | ------------: | -----------: | --------- |
| `deposit_from_public_balance_into_new_shared_balance_v18`     |   427,266,208 |      248,702 | yes, ~2 s |
| `transfer_from_shared_balance_to_new_shared_balance_v18`      | 1,387,781,166 |      912,388 | never     |
| `transfer_from_shared_balance_to_existing_shared_balance_v18` | 1,595,534,454 |    1,019,388 | never     |

The transfer circuit costs roughly 3.2× the deposit in ACU. The SDK defaults the
bid to zero:

```js
// prepareTransfer
const resolvedMicroLamportsPerAcu = microLamportsPerAcu ?? 0n;
```

A zero bid is evidently enough for the deposit. It may not be enough for a
computation three times the size.

**Question for Umbra:** is a non-zero `microLamportsPerAcu` required for the
transfer circuits on devnet, and what is the expected floor?

## Client-side defects found and worked around

All four are `patch-package` hunks against `5.0.0-rc.4`. They are listed here
because they look like upstream issues rather than integration mistakes.

### 1. The MXE key guard rejects a usable key

`extractMxeX25519PublicKeyFromMxeAccount` throws whenever `utilityPubkeys` is
not `Set`, even though the `Unset` variant carries the key — the same key every
other operation reads from `networkConfig.mxePubkey`.

`transfer` is the **only** operation that reads this key from chain. `deposit`,
`burn` and `query` all use the static config value, which is why shielding works
and transfers do not.

Workaround: trust the key material rather than the flag, still throwing on
absent or all-zero bytes.

### 2. No compute-unit limit is ever set

The SDK emits no `SetComputeUnitLimit` instruction on any operation, so the
transfer transaction ships a single instruction and inherits Solana's 200,000 CU
default. It does not fit — the Arcium `QueueComputation` CPI alone costs ~64k,
and the `_to_new_*` variants create the receiver's token account on top:

```
Program …EpAJ consumed 200000 of 200000 compute units
Program …EpAJ failed: exceeded CUs meter at BPF instruction
```

`executeCorePipeline` exposes a `hooks.interceptInstructions` extension point,
but `submitSharedSenderTransfer` never forwards `hooks`, so it is unreachable
from `getTransferorFunction`. `TransactionExecutorConfig` has no compute-budget
field either.

Workaround: prepend a `SetComputeUnitLimit` instruction, scoped to the transfer.
Observed consumption afterwards is 218k–242k CU.

### 3. The MPC callback status is discarded

`executeMpcPipeline` returns `{ signature, signedTransaction, callback,
rentClaim }` where `callback.status` is `finalized | pruned | timed-out`. But:

```js
// submitSharedSenderTransfer
const result = await executeMpcPipeline({ … });
return result.signature;          // callback dropped
```

and the public `TransferResult` confirms nothing else is carried:

```ts
type TransferResult =
  | { kind: 'prepared'; preparation: TransferPreparation }
  | {
      kind: 'submitted';
      preparation: TransferPreparation;
      signature: TransactionSignature;
    };
```

**This is what made the failure invisible.** A computation that is queued and
never executed resolves as a successful transfer with a signature. The docs show
`onFinalized` hooks, but only on the deposit path via `queueComputation` — the
transfer path accepts no hooks.

Workaround: carry `callback` through the result and throw unless
`status === "finalized"`.

**Question for Umbra:** is there a supported way to observe MPC settlement from
`getTransferorFunction`? If not, exposing `callback` on the `submitted` variant
would prevent silent failures for every integrator.

### 4. `optionalData` defaults to 32 zero bytes

`prepareTransfer` substitutes `DEFAULT_OPTIONAL_DATA_BYTES` when the caller
omits `optionalData`, with no warning. For any integrator using it as a payment
reference, forgetting the field produces an unattributable payment rather than
an error. Not a bug, but a sharp edge worth a note in the docs.

## How to reproduce

1. Register the sender and shield some wSOL on devnet.
2. Call `getTransferorFunction` with `executorConfig` and send any amount to a
   registered receiver.
3. Observe: the queue transaction succeeds; `queuedComputationCount` on the
   sender's ETA increments; no `CallbackComputation` follows; the receiver's
   `generationIndex` stays at 0.

Reading the state:

```js
const [eta] = await findEncryptedTokenAccountPda(
  { user, mint: 'So11111111111111111111111111111111111111112' },
  { programAddress: UMBRA_PROGRAM_ADDRESS },
);
const decoded = getEncryptedTokenAccountDecoder().decode(accountData);
// decoded.queuedComputationCount, decoded.generationIndex, decoded.oldestPendingSlot
```

## What we need

1. Whether `utilityPubkeys: Unset` on the devnet MXE is expected, and whether it
   blocks transfer computations.
2. Whether transfers on devnet require a non-zero `microLamportsPerAcu`, and the
   expected value.
3. Whether MPC settlement can be observed from the transfer API.
4. Whether callers are expected to set the Solana compute-unit limit themselves.

---

_This report contains no keys or secrets. Every address above is public
on-chain data._
