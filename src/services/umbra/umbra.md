# Umbra — structure & architecture

Stealf's privacy layer, built on `@umbra-privacy/sdk` (**`5.0.0-rc.4`, pinned
exact**) + `@umbra-privacy/rn-zk-prover` (native Mopro proving).

> The pin has no caret on purpose: `patches/@umbra-privacy+sdk+5.0.0-rc.4.patch`
> targets rc.4's built chunk filenames. Let the version float and the patch
> stops applying — and note scanning breaks against the v5 indexer with no
> error at the call site. Bumping = install, regenerate the patch, re-test a
> full scan.

> ⚠️ **Online docs ≠ installed version.** The `sdk.umbraprivacy.com` site is
> often ahead of the installed rc (e.g. `relayerApiEndpoint`, positional
> `createU64`, `store: Promise<void>`). **Reflex: check the `.d.ts` in
> `node_modules`, not the website.**

---

## 1. The two layers

| Layer | Role | Location |
|---|---|---|
| **`services/umbra/`** | SDK integration / infra: client, signers, on-chain operations, queries, storage, crypto, zk | `src/services/umbra/` |
| **`features/umbra/`** | UI: screens, React Query hooks, feature lib | `src/features/umbra/` |

Rule: `services/` **never** depends on `features/`. Operations throw raw; the
mapping to user-facing messages happens in the feature layer
(`useUmbra.wrap` → `parseStealthError`).

---

## 2. The two wallets & the two transfer models

**Two wallets** per user:
- **Stealth** — **local** ED25519 key (Keychain). Signer via `getLocaleSigner`.
- **Bank** — **Turnkey**-custodied (TEE, no local key). Signer via
  `createTurnkeyUmbraSigner`.

**Private-transfer model used**: **stealth pool notes** (mixer). The sender
creates a *burnable* note, the recipient *claims* it → hence the Claims screen.
(The SDK also exposes a direct ETA→ETA transfer `getTransferorFunction` — **not
used** here.)

---

## 3. `services/umbra/` tree

```
client.ts              unified getClient(signer) + getStealthClient/getBankClient/getRelayer
constant.ts            UMBRA_CONFIG (mainnet/devnet switch) + dUSDC/dUSDT mints
registration.ts        isFullyRegistered / checkRegistrationStatus / ensureRegistered…
burntUtxos.ts          blacklist of already-burnt notes (self-healing)

signers/
  locale.ts            getLocaleSigner()  — stealth wallet (local key)
  turnkey.ts           createTurnkeyUmbraSigner() + signTx() + signMessage()

storage/
  masterSeed.ts        createMasterSeedStorage() / clearMasterSeed()  — Keychain
  mmkvStorageBackend.ts  decrypted UTXO/nullifier store (encrypted MMKV)
  asyncStorageBackend.ts legacy (wipe only)

crypto/
  nativeCrypto.ts      AES-GCM (quick-crypto) + X25519 (rn-quick-x25519) for the scan

operations/            (WRITE — on-chain transactions)
  deposit.ts           shield: public ATA → encrypted balance
  withdraw.ts          unshield: encrypted balance → public ATA
  transfer.ts          creates the 4 note variants (Receiver/Self × ETA/ATA)
  burnNotes.ts         claimReceived() / claimSelfToPublic() — burns/claims notes

queries/               (READ)
  scanNotes.ts         fetchClaimScan() — scans + lists claimable notes
  balances.ts          fetchEncryptedBalances()

zk/                    native Mopro proving (see §7)
```

### Key distinction: `scanNotes.ts` vs `burnNotes.ts`

- **`queries/scanNotes.ts`** = **finds** the notes to claim (chain scan, reads
  the store, returns the buckets).
- **`operations/burnNotes.ts`** = **burns/claims** those notes (transactions).

---

## 4. The client (`client.ts`)

Single entry point **`getClient(signer)`**:
- cached by address (`Map<address, client>`) + **in-flight dedup**
  (`Map<address, Promise>`) → one concurrent build per wallet, no double write
  to the MMKV store.
- **two-phase** build (imposed by the stores): bare client → build the sharded
  MMKV stores from it → final client.
- deps: `masterSeedStorage` (seed), `computationMonitor` (polling),
  `legacyMasterSeedSchemes` (decrypt old notes).

Wrappers: `getStealthClient()` = `getClient(getLocaleSigner())`,
`getBankClient(args)` = `getClient(createTurnkeyUmbraSigner(args))`,
`getRelayer()`. `clearClients()` clears everything (logout / switch).

---

## 5. Signing

| Wallet | Key | How |
|---|---|---|
| Stealth | local (Keychain `STEALF_PRIVATE_KEY`) | `createSignerFromPrivateKeyBytes(bs58.decode(pk))` — the SDK accepts a 32-byte seed **or** a 64-byte keypair |
| Bank | remote (Turnkey TEE) | hex↔bytes adapter: the SDK speaks bytes/objects, Turnkey speaks hex |

`IUmbraSigner` requires `signTransaction` **and** `signMessage` (the latter
derives the master seed once — not just for txs).

---

## 6. Registration (`registration.ts`)

On-chain order: `initialised → x25519 → commitment → isActiveForAnonymousUsage`
(the last goes through Arcium MPC, with some lag). **The "ready" signal is
`isActiveForAnonymousUsage`** (it implies all the rest).

- `isFullyRegistered(client)` → bool (`exists && isActiveForAnonymousUsage`)
- `checkRegistrationStatus(client)` → throws if not ready (operation gate)
- `ensureRegistered()` / `ensureRegisteredFor(client)` → **registers** if needed
  (idempotent, in-flight dedup, gated by `isFullyRegistered` to avoid loading
  the 49.5 MB prover for nothing). Explicit: setup / MoveFlow / `useUmbra.register`.

**Operations** verify (`checkRegistrationStatus`) but **do not trigger**
registration. `precheckRecipient` (in `transfer.ts`) verifies the **recipient**
before creating a receiver-note (message → `RECEIVER_NOT_REGISTERED`).

---

## 7. ZK proving (`zk/`)

**Native** proving via `@umbra-privacy/rn-zk-prover` (Mopro/Rust), **not** the
SDK's snarkjs prover (too slow in RN — see shim §9).

```
index.ts                  barrel
types.ts / constants.ts   manifest/asset types + CDN URLs + NATIVE_CIRCUIT_VERSION
services/zkAssetService.ts .zkey download/cache + versioned manifest
provers/prover.ts         createZkProver() — Mopro bridge + proof conversion
provers/{register,createUtxos,claimsUtxos}.ts  specific provers (SDK interface)
utils/proofConverter.ts   Groth16 → byte layout expected by the SDK/program
utils/moproInputs.ts      circuit-input serialization
lib/ttlCache.ts           manifest TTL cache
```

zkeys: `createdepositwithpublicamount.zkey` (~4 MB) shipped in-bundle
(`assets/zk/`); the others lazy-fetched via `zkAssetService`;
`userregistration.zkey` (~49.5 MB) fetched on first register.

**Known fragilities** (harden someday, non-blocking on devnet): stale zkey
possible on a CDN rotation without a manifest bump; no integrity (hash) check on
download; no in-flight lock on the download (`register.ts` not memoized).

---

## 8. Storage — three distinct tiers

| Data | Backend | Where | Wipe |
|---|---|---|---|
| **Master seed** (root secret) | Keychain (SecureStore) | `storage/masterSeed.ts` | `clearMasterSeed(address)` |
| **Decrypted UTXO/nullifier notes** | MMKV (encrypted under a Keychain key) | `storage/mmkvStorageBackend.ts` | `clearAllMmkvStorageBackend()` |
| **Burnt-note blacklist** | SecureStore (hashed key) | `burntUtxos.ts` | `clearBurntUtxos()` |

The seed is a **cache**: deterministically re-derivable via
`signer.signMessage`. Losing it costs a re-derivation, never funds. All of this
is wiped on logout **and** session expiry (`sessionTeardown`, for shared
devices).

---

## 9. Bundler — Metro shims (repo root)

Redirect modules Metro can't/shouldn't bundle. **Don't remove without a control
`expo export`.**

| Shim | Target | Wired via | Why |
|---|---|---|---|
| `crypto-shim.js` | `crypto` (Node) | `extraNodeModules` | minimal polyfill `randomBytes` + `createHash('sha256')` |
| `fs-shim.js` | `fs` (Node) | `extraNodeModules` | empty stub for a never-executed `require('fs')` |
| `snarkjs-shim.js` | `snarkjs` | **`moduleOverrides`** | throw stub: the SDK references snarkjs (JS prover), we prove natively |

⚠️ The snarkjs entry sits in `moduleOverrides` (the `resolveRequest` hook), **not**
in `extraNodeModules`, and must stay there. `extraNodeModules` is only a fallback
for modules Metro fails to resolve — `crypto` and `fs` work there because Node
builtins are never in `node_modules`. But `snarkjs` *is* a declared dep, so the
moment it's installed the alias is skipped, the real package gets bundled, and
the build dies on its `require('readline')`. `resolveRequest` runs first and wins
either way.

`metro.config.js` also does **resolution overrides** to force the SDK's CJS
subpaths (`@umbra-privacy/sdk/query`, `/burn`, `/deposit`…) and various packages
(`isows`, `@peculiar/utils`, `@solana/kit`…). `assetExts` includes `zkey`.

---

## 10. Network config (`constant.ts`)

A single switch:

```ts
export const ACTIVE_NETWORK: network = 'devnet';   // ← change here
export const UMBRA_CONFIG = ({ mainnet: {...}, devnet: {...} } as const)[ACTIVE_NETWORK];
```

`UMBRA_CONFIG` carries `network / rpcUrl / rpcSubscriptionsUrl / indexerApi /
relayerApi`. Imported everywhere (client, operations, queries). Going mainnet =
real money + different program IDs → keep `devnet` while testing.

---

## 11. On the `features/umbra/` side

```
screens/     StealthWalletGate, ClaimPendingScreen, StealfWalletSetup
components/   StealthSetupOverlay
hooks/       useUmbra (ops facade), useClaimScan, useEncryptedBalances,
             usePendingClaims(ForCash), useShieldedSolBalance, useUmbraRegistration,
             useSetupStealfWallet, useStealfWalletSetupFlow, useRegisterStealfWallet,
             useDeleteStealthWallet
lib/         errors (parseStealthError + StealthError + codes), payMethods,
             syncStealfWallet
api/         registerStealfWallet (REST backend)
PrivacyModeContext.tsx
```

`useUmbra` is the facade: `wrap()` catches errors → `parseStealthError`
(code + userMessage) + Sentry, and exposes `deposit/withdraw/sendEncrypted/
claimReceived/claimSelfToPublic/register`.

---

## 12. The internal / UI-copy wall (reminder)

The code keeps the internal names (`stealfWallet`, `STEALF_*` keys, `shielded`
verb, historical folder). The **SecureStore keys** (`STEALF_PRIVATE_KEY`,
`keychainService: 'com.stealf.wallet'`) must **never** change — otherwise every
existing user loses access. In the UI we say "Stealth wallet", "Encrypted
balance", "Shield/Unshield". The name "Umbra" is **internal**, never in visible
copy.
