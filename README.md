# Stealf — privacy-first neobank on Solana

Bank wallet (Turnkey custody, virtual bank account + Stealf card) and a Stealth wallet
(local ED25519 + Umbra encrypted balance) in the same app. Private send,
shield, unshield, and IBAN cash-out from an encrypted balance — all from
one mobile app.

Expo / React Native / TypeScript. iOS-first, Android compatible.

For the deeper Umbra integration spec (architecture, primitives,
deployment), see [`umbra.md`](umbra.md).

## Stack

- **Expo SDK 54** + React Native 0.81 + Expo Router (file-based routes)
- **NativeWind v4** + custom design system in `src/design-system/`
- **TanStack Query** for server state, **Zod** at every IO boundary
- **@solana/kit** for RPC, **Turnkey** for custodial signing, local
  ED25519 for the stealth wallet
- **Umbra SDK** (`@umbra-privacy/sdk`) + Mopro-bundled native ZK
  provers (`@umbra-privacy/rn-zk-prover`) for the encrypted balance
- **Sentry** (crashes) + **PostHog** (events; session replay disabled)

## Get started

Prerequisites: Xcode 15+ with iOS 16+ simulator or device, Node 20+,
CocoaPods.

```bash
npm install
cp .env.example .env   # fill in values; see services/env.ts for required vars
npx expo run:ios       # native build, recommended over expo start for parity
```

`npx expo start` works for UI-only iteration but ZK and Solana paths
need a native build.

### Environment variables

See `src/services/env.ts:3-18` for the canonical Zod schema. Five
required, three optional:

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_ORGANIZATION_ID` | yes | Turnkey root organization |
| `EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID` | yes | Turnkey auth proxy config |
| `EXPO_PUBLIC_API_URL` | yes | Stealf backend base URL |
| `EXPO_PUBLIC_SOLANA_RPC_URL` | yes | Solana JSON-RPC endpoint |
| `EXPO_PUBLIC_SOLANA_WSS_URL` | yes | Solana WebSocket endpoint |
| `EXPO_PUBLIC_SENTRY_DSN` | no | Sentry crash reporting |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | no | PostHog event tracking |
| `EXPO_PUBLIC_POSTHOG_HOST` | no | PostHog instance host |

### Performance note

`run:ios` in **dev** is significantly slower than release (Hermes
interpreter without bytecode, Metro source maps, console-log forwarding,
NativeWind CSS-interop pass, Sentry + PostHog at full sample rate). For
a realistic perf check:

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
assets/zk/           Mopro zkey assets shipped in-bundle
docs/                Architecture, conventions, glossary, ADRs, security audit
```

Path alias: `@/*` resolves to repo root.

## How to use

After OAuth signup, the bank wallet is auto-provisioned (Turnkey
sub-org + Solana account) and the stealth wallet is created locally.
From there: **Shield** moves public balance into the encrypted balance;
**Private send** transfers encrypted USDC to another Stealf user
(amounts and recipients off-chain); **Move** is the bidirectional UX
across Bank ↔ Stealth ↔ Encrypted balance; **Unshield** withdraws back
to a public account for IBAN off-ramp via the Stealf card.

## Read this before touching the code

- [`docs/architecture.md`](docs/architecture.md) — layout + layered model
- [`docs/conventions.md`](docs/conventions.md) — strict 3-layer pattern, naming
- [`docs/glossary.md`](docs/glossary.md) — **internal code names vs UI
  labels** (critical: code keeps `stealfWallet` / `shielded`, UI says
  "Stealth wallet" / "Encrypted balance")
- [`docs/decisions.md`](docs/decisions.md) — ADRs
- [`docs/audit-security.md`](docs/audit-security.md) — security posture,
  deferred mitigations

## Branches

- `main` — **active branch**, GitHub default
- `feat/*` — short-lived feature branches PR'd back into `main`

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

See [LICENSE](LICENSE).
