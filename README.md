# Stealf — mobile app

Privacy-first neobank on Solana. Bank wallet (Turnkey custody, EUR IBAN
+ card) and a Stealth wallet (local ED25519 + Umbra encrypted balance)
in the same app, with a private send flow between users.

Expo / React Native / TypeScript. iOS-first, Android compatible.

## Stack

- **Expo SDK 54** + React Native 0.81 + Expo Router (file-based routes)
- **NativeWind v4** + a custom design system in `src/design-system/`
- **TanStack Query** for server state, **Zod** at every IO boundary
- **@solana/kit** for RPC, **Turnkey** for custodial signing, local
  ED25519 for the stealth wallet
- **Umbra SDK** (`@umbra-privacy/sdk`) + Mopro-bundled ZK provers
  (`@umbra-privacy/rn-zk-prover`) for the encrypted balance
- **Sentry** (crashes) + **PostHog** (events; session replay disabled)

## Get started

```bash
npm install
cp .env.example .env   # fill in values; see services/env.ts for required vars
npx expo run:ios       # native build, recommended over expo start for parity
```

`npx expo start` works for UI-only iteration but the ZK / Solana paths
need a native build.

### Performance note

`run:ios` in **dev** is significantly slower than release (Hermes
interpreter without bytecode, Metro source maps, console-log
forwarding, NativeWind CSS-interop pass, Sentry + PostHog at full
sample rate). For a realistic perf check:

```bash
npx expo run:ios --configuration Release
```

## Project layout

```
app/                 Expo Router routes (default exports only)
src/services/        Shared infra (api client, secureStore, socket, kit, turnkey…)
src/features/        Domain code, 3-layer per feature: api/ → hooks/ → screens/
src/shared/          Cross-cutting components, helpers, types
src/design-system/   Tokens, palettes, typography, primitives
modules/mopro-ffi/   Native ZK provers (Rust → iOS xcframework / Android .so)
docs/                Architecture, conventions, glossary, ADRs, security audit
```

Path alias: `@/*` resolves to repo root.

## Read this before touching the code

- [`docs/architecture.md`](docs/architecture.md) — top-level layout +
  layered model
- [`docs/conventions.md`](docs/conventions.md) — strict 3-layer pattern
  (`api/` → `hooks/` → `screens/`), naming, exports
- [`docs/glossary.md`](docs/glossary.md) — **internal code names vs
  user-facing labels**. Critical. The split is hard: code keeps
  `stealfWallet` / `shielded`, UI says "Stealth wallet" / "Encrypted
  balance".
- [`docs/decisions.md`](docs/decisions.md) — ADRs, including the ones
  rejected with rationale
- [`docs/audit-security.md`](docs/audit-security.md) — security posture,
  open items, deferred mitigations

## Branches

- `main` — historical default; not what stealf-app is built on
- `phase-0-foundation` — **active development branch**, all sprints
  stack on this
- `feat/*` — short-lived feature branches, PR'd into
  `phase-0-foundation`

## Scripts

```bash
npm run start           # Metro dev server
npm run ios             # build + boot iOS (debug config by default)
npm run android         # build + boot Android
npm run lint            # eslint via expo lint
npm run test            # vitest run (pure functions only — Zod, helpers, reducers)
npm run test:watch
```

## License

Proprietary — Stealf © 2026.
