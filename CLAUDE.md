# CLAUDE.md — stealf-app

Context for AI agents working on this repo. Read this before any
non-trivial change.

## What this app is

Stealf is a privacy-first neobank on Solana. Two wallets per user:

- **Bank wallet** — Turnkey-custodied Solana account, bridged to EUR
  IBAN + Stealf card. Signing via Turnkey remote signing (custodial).
- **Stealth wallet** — Local ED25519 wallet, private key in
  SecureStore (Keychain on iOS, Keystore on Android). Holds a public
  ATA *and* an Umbra-encrypted balance. Signing happens locally.

Real money, real users (currently ~150 in a separate prod app called
`front-stealf`; this repo is the UI/UX rebuild). Treat every change
that touches signing, secrets, or balances as production-grade.

## Read first, then code

In this order:

1. `docs/glossary.md` — **the most important file in the repo.** Pins
   the split between internal code names and user-facing labels.
2. `docs/architecture.md` — top-level layout, layered model.
3. `docs/conventions.md` — strict 3-layer pattern + naming.
4. `docs/decisions.md` — ADRs, including ones rejected.
5. `docs/audit-security.md` — known security posture, deferred items.

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
`docs/glossary.md` first — most "drift" is internal vs UI by design.

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
- ✅ Move flow (bank ↔ stealth ↔ encrypted balance)
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

Staff Engineer runs the backend locally on port 5000 (no Railway dev
environment). Front-stealf (the legacy prod app) hits the prod API.
This repo's `.env` should point at `http://localhost:5000` (or
`http://<dev-machine-LAN-ip>:5000` for physical iOS device testing)
during development.

## Mopro / ZK FFI

ZK provers come from `@umbra-privacy/rn-zk-prover` (Mopro-bundled
native xcframework distributed via npm). Don't touch the package source
unless you've read `docs/spike-mopro.md`. The provers consume zkey
assets — one (`createdepositwithpublicamount.zkey`, ~4.0 MB) is shipped
in-bundle at `assets/zk/`; others are lazy-fetched at first use via
`src/features/stealth/zk/services/zkAssetService.ts`. Changes to the
zkey loading strategy ripple into `metro.config.js` and the splash gate.

## When in doubt, defer to docs/

This file is the entry-point. The deeper rules live in `docs/`. Keep
this file lean — when a topic grows past a paragraph here, move it to
`docs/` and link.
