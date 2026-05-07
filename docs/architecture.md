# Architecture

High-level structure of `stealf-app`. Read after `glossary.md`.
Conventions enforcing this are in `conventions.md`.

---

## Goals

1. **Feature-first**: code lives close to the screens it powers.
2. **Strict layers**: shared infra (`services/`) is thin; domain logic
   (`features/`) is local.
3. **Boundaries are typed**: every IO crossing (API, socket) is parsed
   with Zod.
4. **One signing path per asset**: cash → Turnkey, private → local
   ED25519. No mixing.
5. **Killswitch per slice**: every feature ships behind a PostHog flag.
6. **Telemetry from day one**: Sentry (crashes) + PostHog (events,
   replay).

---

## Top-level layout

```
stealf-app/
├── app/                        # Expo Router routes (default exports only)
│   ├── _layout.tsx             # Providers root + auth guard
│   ├── (auth)/                 # Sign in / Sign up flow
│   ├── (tabs)/                 # Authenticated app
│   └── *.tsx                   # Modal routes (send, shield, unshield…)
│
├── src/
│   ├── services/               # Shared infrastructure (singletons)
│   │   ├── api/                # client, errors, types
│   │   ├── auth/               # secureStore wrapper
│   │   ├── cache/              # walletKeyCache (RAM + Keychain)
│   │   ├── env.ts              # validateEnv() at boot
│   │   ├── observability/      # sentry.ts, posthog.ts
│   │   ├── real-time/          # socket.io singleton
│   │   ├── solana/             # @solana/kit clients + tx guard
│   │   └── turnkey/            # Turnkey config + signer adapters
│   │
│   ├── features/               # Domain code, 3-layer per feature
│   │   ├── onboarding/{api,context,hooks,types,screens}
│   │   ├── bank/{api,hooks,types,screens}
│   │   ├── send/{api,hooks,components,…}
│   │   ├── grow/{api,hooks,lib,types,screens}
│   │   └── stealth/{api,hooks,lib,zk,screens}
│   │
│   ├── shared/                 # Truly cross-cutting code
│   │   ├── components/         # ErrorBoundary, OfflineBanner, SliceDisabledScreen
│   │   ├── lib/                # formatAmount, etc.
│   │   ├── schemas/            # Zod schemas used by >1 feature (rare)
│   │   └── types/              # User, Wallet, etc. (used by >1 feature)
│   │
│   ├── constants/              # SOL_MINT, USDC_MINT, route names…
│   └── design-system/          # Already in place — primitives, tokens, palettes
│
├── modules/
│   └── mopro-ffi/              # Rust ZK provers (native module, Slice 5)
│
└── docs/                       # This folder
```

`@/*` resolves to repo root. So `@/src/services/api/client` and
`@/app/_layout` are both valid imports.

---

## Layered model

```
┌─────────────────────────────────────────────────────────────┐
│  app/* (Expo Router)                                        │
│    Routes. Mostly thin. Default exports only.               │
└───────────────────────────────▲─────────────────────────────┘
                                │ uses
┌───────────────────────────────┴─────────────────────────────┐
│  src/features/<name>/screens/*                              │
│    UI. Consumes hooks. Never fetches.                       │
└───────────────────────────────▲─────────────────────────────┘
                                │ uses
┌───────────────────────────────┴─────────────────────────────┐
│  src/features/<name>/hooks/*                                │
│    React Query (useQuery / useMutation). Wraps api/.        │
└───────────────────────────────▲─────────────────────────────┘
                                │ uses
┌───────────────────────────────┴─────────────────────────────┐
│  src/features/<name>/api/*  (+ subscribeXxx for socket)     │
│    Pure functions. Zod-parsed boundaries. Throws ApiError.  │
└───────────────────────────────▲─────────────────────────────┘
                                │ uses
┌───────────────────────────────┴─────────────────────────────┐
│  src/services/*                                             │
│    Singletons: api client, socket, secureStore, kit, turnkey│
└─────────────────────────────────────────────────────────────┘
```

This is enforced by **convention**, not by build tools. Reviewers reject
PRs that bypass a layer (e.g., a screen calling `apiGet` directly).

---

## Sources of truth (client-side)

| Field                    | Source                  | Rationale                                                         |
|--------------------------|-------------------------|-------------------------------------------------------------------|
| `userId`, `email`, `bankWallet` | Turnkey SDK     | Owned by the auth provider. Never persisted manually.             |
| `stealfWallet` (priv key)| `expo-secure-store`     | Local secret. Backed by Keychain.                                 |
| `subOrgId`               | `expo-secure-store`     | Cached for cold-start hydration. Authoritative copy = Turnkey.    |
| `username`, `points`, KYC| Backend → React Query   | App-domain fields. Never persisted manually.                      |
| Balance, history, yield  | Backend → React Query   | Updated reactively via socket.                                    |
| Shielded balance         | Computed client-side    | Decryption requires master seed (Keychain).                       |

**Anti-pattern eliminated**: storing user-profile fields in AsyncStorage
"to skip the fetch on cold start". This was a recurring source of stale
data in `front-stealf`. We never re-introduce it.

---

## Auth context = state only

`AuthContext` exposes `{ user, session, isAuthenticated, loading, logout }`
and **nothing else**. It does not orchestrate side-effects.

Side-effects (socket open/close, prefetches, subscriptions) live in
`<DataBootstrap />`, mounted once under the AuthProvider:

```tsx
function DataBootstrap() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    socketService.connect(user.session.token);
    const cleanups = [
      subscribeToWalletUpdates(qc, user.bankWallet),
      subscribeToWalletUpdates(qc, user.stealfWallet),
      subscribeToYieldUpdates(qc, user.subOrgId),
      // … one subscribeXxx per active slice
    ];
    return () => {
      cleanups.forEach((fn) => fn());
      socketService.disconnect();
    };
  }, [user]);

  return null;
}
```

This makes auth lifecycle predictable and testable, and lets each
feature own its own subscription module (`features/<name>/api/subscriptions.ts`).

---

## Provider tree (root layout)

```tsx
<SentryProvider>                      {/* error boundary + scope */}
  <PostHogProvider client={posthog}>  {/* events, flags, replay */}
    <QueryClientProvider client={qc}>
      <TurnkeyProvider config={CFG}>
        <AuthProvider>
          <SocketProvider>
            <DataBootstrap />
            <SafeAreaProvider>
              <Stack screenOptions={{ headerShown: false }}>
                {/* … routes */}
              </Stack>
            </SafeAreaProvider>
          </SocketProvider>
        </AuthProvider>
      </TurnkeyProvider>
    </QueryClientProvider>
  </PostHogProvider>
</SentryProvider>
```

Auth guard (redirect to sign-in if not authenticated) is implemented in
`_layout.tsx` via `useEffect` + `router.replace()`. Same pattern as
front-stealf.

---

## Native modules

- ZK provers come from `@umbra-privacy/rn-zk-prover` (Mopro-bundled
  native xcframework distributed via npm). Required for Slice 5
  (Stealth). Validated end-to-end in Phase 0 spike.
- Polyfills (`polyfills.ts`) loaded **before** anything else via the
  custom `index.js` (replaces `expo-router/entry` as `package.json`'s
  `main`).
- Metro extras (Buffer, crypto-shim, fs-shim) for Solana stack. Slice 5
  adds snarkjs/ffjavascript/zkey overrides.

---

## Telemetry & feature flags

- **Sentry** initialised at root. Captures crashes, unhandled promise
  rejections, navigation breadcrumbs.
- **PostHog** initialised at root. Captures screen views, custom
  events, session replay (sampled).
- **Feature flags** gate every slice. See `conventions.md` §Feature
  flags. Default behaviour when a flag is undefined: enabled (so
  development isn't blocked by missing PostHog config).

Both SDKs init lazily — missing DSN/key in dev → no-op with a warn,
app boots fine.

---

## Anti-patterns we explicitly avoid

| From front-stealf                                            | Replacement                                                   |
|--------------------------------------------------------------|---------------------------------------------------------------|
| Manual `[loading, setLoading]` on every action               | `useMutation`                                                 |
| Top-level `globalQueryClient` referenced from non-React code | `useQueryClient()` inside `subscribeXxx`, passed by `<DataBootstrap />` |
| Duplicate type definitions (Zod schema + standalone interface)| `z.infer<typeof Schema>` only                                 |
| Service code reading React state                             | Inputs as fn args; React state stays in hooks/components       |
| `prefetchYieldData` bypassing the api client                 | All fetches go through `apiGet/apiPost`                       |
| No env validation                                            | `validateEnv()` at boot, fails fast                            |
| No telemetry until after release                             | Sentry + PostHog from Phase 0                                  |
