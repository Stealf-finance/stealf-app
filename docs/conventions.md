# Conventions

Coding conventions for `stealf-app`. Strict — these rules are the cost we
pay for the codebase staying readable as it grows. Deviations need a
justification (and ideally an ADR in `decisions.md`).

---

## Imports

- **Path alias**: `@/*` → repo root. Always use it.
  - ✅ `import { T } from '@/src/design-system/tokens'`
  - ❌ `import { T } from '../../../design-system/tokens'`
- One import group order: external packages → `@/...` → relative (rare).
- No barrel `index.ts` re-exports unless it strictly reduces import noise.

## Files & folders

- **Folders**: `kebab-case` (`real-time/`, `yield-deposit/`).
- **Component files**: `PascalCase.tsx` (`BankWallet.tsx`).
- **Hook files**: `camelCase.ts` starting with `use` (`useBalance.ts`).
- **Pure modules**: `camelCase.ts` (`secureStore.ts`, `validators.ts`).

## Exports

- **Feature code**: named exports.
- **Expo Router routes** (`app/**/*.tsx`): default export (Expo requirement).
- One concept per file. If a file exports >3 unrelated things, split it.

---

## Architecture: 3-layer pattern (strict)

Every feature follows the same shape:

```
src/features/<name>/
├── api/         # Pure functions. Take an `AuthenticatedApi`. Parse with Zod.
├── hooks/       # React Query (useQuery / useMutation). Wrap api/.
├── types.ts     # Inferred via z.infer<typeof Schema>. Never duplicated.
└── screens/     # UI only. Consume hooks. No fetch, no state mgmt logic.
```

**Rules**:

1. **`api/` functions never read React state**, never call hooks, never
   touch the queryClient. They take inputs, hit the network (via the
   shared `apiGet/apiPost/apiDelete`), parse with Zod, return data or
   throw `ApiError`.
2. **`hooks/` are the only place** that imports React Query. They wrap
   `api/` functions and expose a stable hook surface
   (`{ data, isLoading, error }` for queries, mutation objects for
   mutations).
3. **`screens/` consume hooks**. They never fetch, never call
   `apiGet`. UI only.
4. **Types live next to the schema**: `export type Foo = z.infer<typeof FooSchema>`.

### Example

```ts
// api/balance.ts
export const BalanceSchema = z.object({ sol: z.number(), usdc: z.number() });
export type Balance = z.infer<typeof BalanceSchema>;
export const balanceQueries = { byAddress: (a: string) => ['balance', a] as const };
export async function fetchBalance(api: AuthenticatedApi, address: string): Promise<Balance> {
  const raw = await api.get(`/api/wallet/${address}/balance`);
  return BalanceSchema.parse(raw);
}

// hooks/useBalance.ts
export function useBalance(address: string) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: balanceQueries.byAddress(address),
    queryFn: () => fetchBalance(api, address),
    enabled: !!address,
    staleTime: Infinity, // updates pushed via socket
  });
}

// screens/BankWallet.tsx
const { data, isLoading } = useBalance(bankWallet);
```

### Mutations

Always `useMutation`. Never manual `[loading, setLoading, error, setError]`.
Side-effects in `onSuccess` (invalidate queries) and `onError` (toast).

---

## Validation: Zod at every boundary

- **Every API response** is parsed via `Schema.parse(raw)` inside `api/`.
- **Every socket event** is parsed via `EventSchema.parse(payload)` in
  `subscribeXxx()`.
- Types are derived (`z.infer`), never declared twice.
- Parse failure → `ApiError` (or logged + fallback for low-criticality
  events). Never silently coerce.

## Error handling

- `ApiError` thrown by `apiGet/apiPost/apiDelete`, propagated by React
  Query as `error`.
- Mutations show user feedback via `onError` (toast / alert / banner).
- Unexpected crashes caught by `<ErrorBoundary>` at root → friendly
  fallback screen.
- Sentry captures everything in production (configured in
  `services/observability/sentry.ts`).
- Domain-specific error classes (`UmbraError`) carry a `code` so the UI
  can branch.

## Logging

- Dev only: `if (__DEV__) console.log(...)`. Strip everything else.
- Production logging goes through Sentry breadcrumbs / events. No
  `console.log` in shipped code.

## Styling

- Default to **NativeWind** classes (`className="text-white text-lg"`).
- Inline `style` only when:
  - Reading a design-system token (`style={{ backgroundColor: T.bg }}`).
  - Animating with Reanimated.
- No raw color literals. Always go through `@/src/design-system/tokens`
  or palettes.

---

## Feature flags (one per slice — REQUIRED)

Every slice ships behind a PostHog feature flag. This gives us a
killswitch without a redeploy when (not if) something breaks in prod.

**Naming**: `slice-<name>-enabled` (kebab-case).
- `slice-auth-enabled`
- `slice-bank-enabled`
- `slice-send-enabled`
- `slice-grow-enabled`
- `slice-stealth-enabled`

**Wiring**:

```ts
import { useFeatureFlag } from 'posthog-react-native';

export function GrowHub() {
  const enabled = useFeatureFlag('slice-grow-enabled');
  if (enabled === false) return <SliceDisabledScreen feature="Grow" />;
  // … real UI
}
```

**`SliceDisabledScreen`** (in `src/shared/components/`) is a generic
placeholder — friendly message, link to status page. Created in Slice 1.

**Default**: until a flag is created server-side, `useFeatureFlag` returns
`undefined` → treat as enabled. Flags are created in PostHog the day a
slice ships and toggled off only on incident.

**Slice README** (`src/features/<name>/README.md`, 3-5 lines): name the
flag and its current state. Updated when the flag is flipped.

---

## Telemetry (Sentry + PostHog)

- **Sentry**: crashes + unhandled errors + perf sampling. Init in
  `app/_layout.tsx` via `services/observability/sentry.ts`. DSN read
  from `EXPO_PUBLIC_SENTRY_DSN`. Missing DSN → init no-ops with a `__DEV__`
  warn (Phase 0 boots without secrets).
- **PostHog**: user events, feature flags, session replay. Same
  lazy-init pattern. API key from `EXPO_PUBLIC_POSTHOG_API_KEY`.
- **Identify on login**: both SDKs are tied to the user via
  `subOrgId` (never email/PII).
- **Reset on logout**: clear identification on both SDKs to avoid
  cross-user leakage on shared devices.

## Tests (Vitest)

- Pure functions only: `api/` (mock api, assert Zod parse), validators,
  crypto helpers (`encryptDepositMemo`, `u128ToLE`).
- File next to source: `secureStore.ts` ↔ `secureStore.test.ts`.
- No component tests for now (would need RN Testing Library — out of
  scope per plan §5.4).
- Run via `npm test` (Vitest).

## Git

- Commits: imperative mood, scoped (`feat(bank): wire balance hook`).
- One commit per logical sub-step during migration phases (reviewability).
- No `console.log` left in committed code.
- Lefthook (or pre-commit) runs `lint + tsc --noEmit` (set up at end of
  Phase 0 if time allows; otherwise Slice 1).

## Documentation

- Top-level docs in `docs/`: `architecture.md`, `conventions.md`,
  `decisions.md`, `glossary.md`, `pipeline.md`, `audit-security.md`,
  `services-migration-plan.md`.
- One `README.md` per `src/features/<name>/` (3-5 lines): what it does,
  endpoints consumed, socket events, **active feature flag**.
- Update docs in the **same PR** as the code change. Stale doc = deleted
  doc.
- Language: **English** for all docs and comments.

## Comments

- Default: don't write comments. Names should explain *what*.
- Write a comment when the *why* is non-obvious: a hidden constraint, a
  workaround for a bug, a subtle invariant.
- Never narrate the task or the call site (no "used by SendFlow",
  "added for ticket #42"). Those rot.
