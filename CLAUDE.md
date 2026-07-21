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

- `postinstall` runs `patch-package` — the Umbra SDK scanner patch
  (`patches/@umbra-privacy+sdk+*.patch`) is applied on every install. Don't
  hand-edit `node_modules`; edit the patch.
- Vitest only covers pure functions (`environment: 'node'`, `@` aliased to
  repo root). Anything importing a React Native native module won't run under
  Vitest — keep testable logic in `lib/` helpers, not in hooks/screens.
- There is no typecheck script; run `npx tsc --noEmit` if you need one.

## What this app is

Stealf is a privacy-first neobank on Solana. Two wallets per user:

- **Bank wallet** — Turnkey-custodied Solana account, bridged to virtual
  bank account + Stealf card. Signing via Turnkey remote signing.
- **Stealth wallet** — Local ED25519 wallet, private key in
  SecureStore (Keychain on iOS, Keystore on Android). Holds a public
  ATA _and_ an Umbra-encrypted balance. Signing happens locally.

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

Code keeps `stealfWallet`, `STEALF_*` SecureStore keys,
`src/features/stealth/`, `keychainService: 'com.stealf.wallet'`,
`shielded` / `unshielded` verbs internally. UI strings say "Stealth
wallet", "Encrypted balance", "Shield" / "Unshield".

**Do NOT** rename schema fields, SecureStore keys, folder names, or
DB-side identifiers in pursuit of clarity. Renaming them resets every
existing user's wallet access, breaks AuthContext hydration, and
forces a backend migration. UI-only changes are cheap; everything
else is a breaking change.

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

### 3. Signing paths don't mix

- Bank wallet → Turnkey signer.
- Stealth wallet → local ED25519 signer (`@solana/kit` keypair from
  SecureStore).

Never reach across. If you need to sign on behalf of the stealth
wallet, you go through `walletKeyCache` → SecureStore → ED25519.
Never expose the bank wallet's private key (Turnkey holds it inside
TEEs; the client never sees it).

### 4. Secrets handling

- `EXPO_PUBLIC_*` env vars are bundled into the JS payload — they are
  config, NOT secrets.
- True secrets (Turnkey signing keys, server JWT keys) never live in
  this repo or its env.
- SecureStore keys (`STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`,
  `SESSION_TOKEN`) require `requireAuthentication: true` (Face ID).
- `walletKeyCache` has a 15-minute TTL. Don't extend it; don't bypass
  it; don't log its contents.

### 5. Branches

- `main` is the active branch and GitHub default.
- All work happens on `feat/*` branches stacked on `main`, PR'd back
  into it.

## Slice status (what's wired vs. what isn't)

The app is built in vertical slices. Current state:

- ✅ Onboarding (single OAuth + Email-OTP `AuthFlow`)
- ✅ Bank (balance, history, send simple, receive)
- ✅ Stealth (Umbra wallet setup, shield, unshield, private send,
  claims, encrypted balance)
- ✅ Move flow (bank ↔ stealth ↔ encrypted balance) — internal
  feature folder is `src/features/moove/`
- ✅ Profile (private key export, mnemonic export, logout, delete
  account)
- ✅ Telemetry (Sentry crashes, PostHog events — session replay
  disabled per security policy)
- ⚠️ Yield (Grow) — UI exists, services not yet fully wired
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
on the same Wi-Fi; a simulator can use `localhost`). On-chain stealth
ops go through the public devnet RPC + relayer, not this backend.

## Mopro / ZK FFI

ZK provers come from `@umbra-privacy/rn-zk-prover` (Mopro-bundled
native xcframework distributed via npm). Don't touch the package source
unless you've read `.claude/docs/spike-mopro.md`. The provers consume zkey
assets — one (`createdepositwithpublicamount.zkey`, ~4.0 MB) is shipped
in-bundle at `assets/zk/`; others are lazy-fetched at first use via
`src/features/stealth/zk/services/zkAssetService.ts`. Changes to the
zkey loading strategy ripple into `metro.config.js` and the splash gate.

## Umbra SDK v5 (stealth core)

The stealth flow runs on `@umbra-privacy/sdk` `5.0.0-rc.4`
(`rn-zk-prover` 5.0.0). Key integration facts, all in
`src/services/umbra/`:

- **Client** (`client.ts`): two-phase `getUmbraClient` build (bare client
  → sharded stores → final client), `getPollingComputationMonitor` in
  deps, and `legacyMasterSeedSchemes: [v4]` so notes created under older
  SDK versions still decrypt. `masterSeedSchemeId` is threaded scan →
  claim.
- **Storage** (`storage/mmkvStorageBackend.ts`): the sharded UTXO /
  nullifier stores persist to **MMKV** (`react-native-mmkv`, Nitro), not
  AsyncStorage. A version-gated one-time wipe forces a clean re-scan on
  migration.
- **Scan crypto** (`crypto/nativeCrypto.ts`): the burnable-note scanner
  uses native crypto — AES-256-GCM via `react-native-quick-crypto`, and
  X25519 via `@umbra-privacy/rn-quick-x25519` `scalarMultAsync` (runs on a
  background thread, zero-copy ArrayBuffer). Without this a full
  merkle-tree scan blocks the JS thread for ~20s. The SDK scanner is
  patched (`patches/@umbra-privacy+sdk+5.0.0-rc.4.patch`) to `await` the
  async X25519; the same patch carries a base64-LE bigint parse fix.
- Devnet test tokens dUSDC / dUSDT live in `src/constants/solana.ts`.

## When in doubt, defer to .claude/docs/

This file is the entry-point. The deeper rules live in `.claude/docs/`
(local, gitignored). Keep this file lean — when a topic grows past a
paragraph here, move it to `.claude/docs/` and link.
