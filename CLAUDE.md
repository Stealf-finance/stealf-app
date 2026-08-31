# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Context for AI agents working on this repo. Read this before any
non-trivial change.

## Commands

```bash
# Run — Expo dev server / native builds (native build is slow in dev; see caveat below)
npm start                     # Metro dev server
npm run ios                   # expo run:ios (build + launch on simulator/device)
npm run android               # expo run:android
npx expo run:ios --configuration Release   # the only honest perf check

# Lint (eslint-config-expo, flat config)
npm run lint

# Tests (Vitest, node env — pure logic only; no RN native modules)
npm test                      # vitest run (CI mode)
npm run test:watch            # vitest watch
npx vitest run src/features/bank/__tests__/schemas.test.ts   # single file
npx vitest run -t "describes a claim line"                   # single test by name

# iOS native regen (after native dep / config changes)
npm run prebuild:ios          # expo prebuild + append SENTRY_AUTH_TOKEN
npm run prebuild:ios:clean    # nuke ios/ and regenerate
```

Notes:

- `postinstall` runs `patch-package` — the Umbra SDK patch
  (`patches/@umbra-privacy+sdk+5.0.0-rc.4.patch`) is applied on every
  install. Don't hand-edit `node_modules`; edit the patch. It is
  version-locked: if it stops applying, the SDK moved — see the Umbra SDK
  section before bumping anything.
- Vitest only covers pure functions (`environment: 'node'`, `@` aliased to
  repo root). Anything importing a React Native native module won't run under
  Vitest — keep testable logic in `lib/` helpers, not in hooks/screens.
- There is no typecheck script; run `npx tsc --noEmit` if you need one.

## What this app is

Stealf is a privacy-first neobank on Solana. **One wallet per user:**

- **Bank wallet** — Turnkey-custodied Solana account, bridged to virtual
  bank account + Stealf card. Signing via Turnkey remote signing, always.
  Holds a public ATA _and_ an Umbra-encrypted balance behind it.

> A second, locally-keyed **stealth wallet** used to sit alongside it and
> carried the whole privacy layer. It was removed on
> `feat/single-turnkey-wallet`; Turnkey now signs xStocks, Reflect, Jito,
> Umbra, swap and send alike. It only ever ran on devnet, so no migration
> was needed and its Keychain items are purged outright — see rule 4.

Real money, real users (currently ~150 in a separate prod app called
`front-stealf`; this repo is the UI/UX rebuild). Treat every change
that touches signing, secrets, or balances as production-grade.

## Read first, then code

In this order:

> Note: the deep docs now live under `.claude/docs/` (local, gitignored —
> not in the repo). Paths below point there.

1. `.claude/docs/glossary.md` — **the most important file in the repo.** Pins
   the split between internal code names and user-facing labels.
2. `.claude/docs/architecture.md` — top-level layout, layered model.
3. `.claude/docs/conventions.md` — strict 3-layer pattern + naming.
4. `.claude/docs/decisions.md` — ADRs, including ones rejected.
5. `.claude/docs/audit-security.md` — known security posture, deferred items.

## Hard rules — never deviate without explicit user sign-off

### 1. The internal-code / UI-copy split is a wall

Code keeps the `STEALF_*` SecureStore keys,
`keychainService: 'com.stealf.wallet'`, and the `shielded` / `unshielded`
verbs internally. UI strings say "Encrypted balance", "Shield" /
"Unshield".

> Two signed-off exceptions, both already applied: the feature folder
> moved `src/features/stealth/` → `src/features/umbra/` (with the ZK
> layer, to `src/services/umbra/zk/`) on `feat/umbra-review`; and
> `stealfWallet` / `stealthRegistered` left the user schema entirely on
> `feat/single-turnkey-wallet`, when the wallet they named was removed.
> The identifiers listed above are the ones that must never move —
> renaming any of them is a breaking change.

**Do NOT** rename schema fields, SecureStore keys, or DB-side
identifiers in pursuit of clarity. Renaming them resets every existing
user's wallet access, breaks AuthContext hydration, and forces a backend
migration. UI-only changes are cheap; everything else is a breaking
change. Folder and file names are the one safe category — they hold no
user state — but they still need sign-off, because half the docs point
at them.

If you think you've found an inconsistency to fix, check
`.claude/docs/glossary.md` first — most "drift" is internal vs UI by design.

### 2. The 3-layer pattern is strict

`api/` (pure fns + Zod parse) → `hooks/` (React Query wrap) →
`screens/` (UI consumes hooks). Never:

- Call `apiGet/apiPost` from a screen.
- Import another feature's `api/` from a screen
  (cross-feature `prefetchQuery` belongs in a shared hook or
  `DataBootstrap`).
- Skip the Zod parse step at an IO boundary (REST or socket event).
- Read React state from inside an `api/` function.

When a screen file gets >700 LOC, that's the signal it's leaking
business logic. Decompose before adding more.

### 3. There is exactly one signing path

**Everything signs through Turnkey.** There is no local key left in the
app — no keypair to construct, nothing to read out of SecureStore.
Turnkey holds the private key inside TEEs and the client never sees it;
keep it that way.

Two shapes, depending on the caller:

- **React** — `useTurnkeySigning()` binds Turnkey's `signTransaction` to
  the bank wallet's Solana account (matched by address, never
  `accounts[0]`) and hands back a hex-in/hex-out `signHex`. Services take
  it as a plain argument, which is what keeps them free of React.
  `signAndSendWithTurnkey` (`services/turnkey/solanaTx.ts`) wraps it for
  legacy web3.js transactions that also need ephemeral co-signers.
- **Umbra's service layer** — plain async code with no React context, so
  it reads an `IUmbraSigner` from `services/umbra/signers/active.ts`.
  `useUmbraSigner` (mounted once in `DataBootstrap`) installs it. The
  installed signer is stable per address and delegates through refs to
  the current Turnkey callbacks — do not bind today's closures into it,
  the assembled client is cached by address and holds the signer object.

If no signer is installed yet, Turnkey has not finished hydrating. Fail
and let the caller retry; never fall back to anything else.

### 4. Secrets handling

- `EXPO_PUBLIC_*` env vars are bundled into the JS payload — they are
  config, NOT secrets.
- True secrets (Turnkey signing keys, server JWT keys) never live in
  this repo or its env.
- ⚠️ **SecureStore is NOT biometric-gated today.**
  `resolveOptions()` in `services/auth/secureStore.ts` ignores its `key`
  argument and returns `BASE_OPTIONS` for everything, so
  `requireAuthentication` is unset on every key — including
  `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC` and `SESSION_TOKEN`.
  `HIGH_SENSITIVITY_KEYS` is declared and never consulted. This was
  deliberate (`43f7de7`, "disable Face ID gating for devnet") and there is
  no biometry anywhere in the app: `expo-local-authentication` is not a
  dependency and `app/lock.tsx` is a stub. Assume anything in SecureStore
  is readable on an unlocked device, and do not write code that relies on
  a Face ID prompt.
  **Re-enabling it is a migration, not a flag flip.** expo-secure-store
  appends `:auth` / `:no-auth` to `keychainService` only when
  `requireAuthentication` is explicitly set. Today it is `undefined`, so
  items live under `com.stealf.wallet`; setting it to `true` moves them to
  `com.stealf.wallet:auth` — a different Keychain item. Every existing
  user's private key and mnemonic become unreadable, recoverable only by
  manual mnemonic re-import. Write the migration first.
- The removed stealth wallet's Keychain items (`STEALF_PRIVATE_KEY`,
  `STEALF_MNEMONIC`, `STEALF_WALLET_ADDRESS`) are **delete-only**: nothing
  writes them, and `clearLegacyStealthKeys()` wipes them at boot, on both
  teardown paths, and on account deletion. The wallet was devnet-only, so
  no sweep was needed. `SECURE_STORE_KEYS` keeps the names purely so the
  deletion can address them — don't reintroduce a writer.
- `HIGH_SENSITIVITY_KEYS` now lists only `SESSION_TOKEN`. The genuinely
  sensitive material sits under runtime-built names that list can't hold:
  `umbra_master_seed_<hash>` (the viewing key) and
  `umbra_store_encryption_key` (unlocks the decrypted UTXO store).
- Umbra's MMKV note store is encrypted at rest under a random key held in
  the Keychain (`storage/mmkvStorageBackend.ts`). It holds _decrypted_
  UTXOs — wipe it via `clearAllMmkvStorageBackend()` on any logout or
  account-deletion path you add.

### 5. Branches

- `main` is the active branch and GitHub default.
- All work happens on `feat/*` branches stacked on `main`, PR'd back
  into it.

## Slice status (what's wired vs. what isn't)

The app is built in vertical slices. Current state:

- ✅ Onboarding (single OAuth + Email-OTP `AuthFlow`)
- ✅ Bank (balance, history, send simple, receive)
- ✅ Privacy / Umbra (registration, shield, unshield, private send,
  claims, encrypted balance) — all on the bank wallet
- ✅ Profile (Turnkey recovery-phrase export, logout, delete account)
- ✅ Telemetry (Sentry crashes, PostHog events — session replay
  disabled per security policy)
- ⚠️ Yield (Grow) — three products wired, all **mainnet-only**, so none
  has run end-to-end: Reflect/STLF (`features/reflect/`), xStocks
  (`features/xstocks/`), JitoSOL (`features/jito/`, APY read from Jito's
  public stake-pool API). Jito's stake/unstake instructions carry
  ephemeral co-signers, so they go through `signAndSendWithTurnkey`
  rather than Turnkey's sign-and-broadcast.
- ⚠️ Swap (`features/swap/`) — public swap via Jupiter. The private swap
  (unshield → ephemeral → Jupiter → re-shield) is not in the tree: it
  lives in open draft PR #56, guarded off, on standby.
- ⚠️ Card — stub
- ⚠️ App lock screen (`app/lock.tsx`) — stub by design (Thomas
  deferred niveau-2 lock; AppState background clear also deferred)

## Dev environment caveats

### `npx expo run:ios` is slow in dev

That's expected. ~60-70% of perceived lag is dev-mode (Hermes
without bytecode, Metro source maps, console.log forwarding,
PostHog/Sentry at full sample rate). Real perf check is:

```bash
npx expo run:ios --configuration Release
```

Two known release-time bottlenecks survive: the
`userregistration.zkey` (49.5 MB) loaded eagerly at module init in
`zkAssetService.ts`, and the splash gate's PRELOAD_IMAGES list
(currently being addressed in `feat/frontend-perf-ux-polish`).

### Backend is local-dev only

Staff Engineer runs the backend locally (no Railway dev environment).
Front-stealf (the legacy prod app) hits the prod API. The live port is
whatever `EXPO_PUBLIC_API_URL` in `.env` points at — currently
`http://192.168.1.29:3000` (a LAN IP, so a physical iOS device must be
on the same Wi-Fi; a simulator can use `localhost`). On-chain privacy
ops go through the public devnet RPC + relayer, not this backend.

The backend still accepts and returns `stealf_wallet` on the user
profile and `walletType: 'stealf'` on the faucet. The client ignores the
first and always sends `'cash'` for the second; dropping them server-side
is a separate cleanup.

## Mopro / ZK FFI

ZK provers come from `@umbra-privacy/rn-zk-prover` (Mopro-bundled
native xcframework distributed via npm). Don't touch the package source
unless you've read `.claude/docs/spike-mopro.md`. The provers consume zkey
assets — one (`createdepositwithpublicamount.zkey`, ~4.0 MB) is shipped
in-bundle at `assets/zk/`; others are lazy-fetched at first use via
`src/services/umbra/zk/services/zkAssetService.ts`. Changes to the
zkey loading strategy ripple into `metro.config.js` and the splash gate.

## Umbra SDK v5 (privacy core)

The privacy flow runs on `@umbra-privacy/sdk` `5.0.0-rc.4`
(`rn-zk-prover` 5.0.0). The version is pinned **exact — no caret**: the
`patch-package` patch targets rc.4's built chunk filenames, so any float
(rc.6 included) makes it fail to apply, and note scanning breaks against
the v5 indexer with no error at the call site. Moving off rc.4 is a
deliberate three-step job: install → regenerate the patch → re-test a
full scan.

Key integration facts, all in `src/services/umbra/`:

- **Client** (`client.ts`): two-phase `getUmbraClient` build (bare client
  → sharded stores → final client), `getPollingComputationMonitor` in
  deps, and `legacyMasterSeedSchemes: [v4]` so notes created under older
  SDK versions still decrypt. `masterSeedSchemeId` is threaded scan →
  claim. `getActiveClient()` is the only accessor; it reads the signer
  from `signers/active.ts` (see rule 3) and caches per address.
- **Storage** (`storage/mmkvStorageBackend.ts`): the sharded UTXO /
  nullifier stores persist to **MMKV** (`react-native-mmkv`, Nitro), not
  AsyncStorage. A version-gated one-time wipe forces a clean re-scan on
  migration.
- **Scan crypto** (`crypto/nativeCrypto.ts`): the burnable-note scanner
  uses native crypto — AES-256-GCM via `react-native-quick-crypto`, and
  X25519 via `@umbra-privacy/rn-quick-x25519` `scalarMultAsync` (runs on a
  background thread, zero-copy ArrayBuffer). Without this a full
  merkle-tree scan blocks the JS thread for ~20s. The async function is
  injected as a scanner dep in `queries/scanNotes.ts`; rc.4 already
  `await`s it upstream, so no patch is involved in that path.
- **SDK patch** (`patches/@umbra-privacy+sdk+5.0.0-rc.4.patch`) — two
  unrelated fixes, neither about X25519: a base64-LE bigint decode for
  the indexer's `h1_version` / `h1_commitment_index` (the parser calls
  `BigInt()` straight on a base64 string), and `await import(…)` →
  `require(…)` for the indexer chunk so Metro can resolve it.
- Devnet test tokens dUSDC / dUSDT live in `src/constants/solana.ts`.

## When in doubt, defer to .claude/docs/

This file is the entry-point. The deeper rules live in `.claude/docs/`
(local, gitignored). Keep this file lean — when a topic grows past a
paragraph here, move it to `.claude/docs/` and link.
