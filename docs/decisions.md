# Architecture Decision Records

Append-only log. Each decision gets one ADR. Superseded ADRs stay in
the file, marked `Superseded by ADR-NNN`.

Format:

```
## ADR-NNN — Title
Date · Status (Proposed / Accepted / Superseded by ADR-XXX)

### Context
What problem are we solving?

### Decision
What we chose.

### Consequences
What this enables / costs.
```

---

## ADR-001 — Services migration strategy: hybrid C, 5 vertical slices
2026-04-27 · Accepted

### Context

`stealf-app` is a UI/UX rewrite of `front-stealf`. The old repo's
business logic (Turnkey auth, Solana RPC, Arcium yield, Umbra privacy,
Socket.io real-time, React Query cache) needs to be brought into the
new repo. UI is already partially built with mock data.

Three migration options were considered:
- **A** — Rewrite everything from scratch alongside the UI.
- **B** — Lift-and-shift the entire old repo's `src/`, then refactor.
- **C** — Hybrid: 1 day of universal infra (Phase 0), then 5 vertical
  slices (Auth → Bank → Send → Grow → Stealth) shipping
  feature-by-feature.

### Decision

**Option C (hybrid).**

Phase 0 (revised to ~2-2.5 days, see ADR-002, ADR-003, ADR-004) sets up
shared infrastructure: api client, socket singleton, SecureStore wrapper,
walletKeyCache, Solana kit, Turnkey config, polyfills, telemetry.

Then each slice is a self-contained feature: `features/<name>/{api,hooks,types,screens}`,
ending with the screen wired to real backend, behind a PostHog flag.

### Consequences

- **Pro**: every slice is independently testable + shippable. Reviewers
  see one domain at a time. Bugs found in slice N inform slices N+1…N+5.
- **Pro**: the UI/UX team (Thomas) can keep tuning visuals on later
  slices while earlier ones go to user testing.
- **Con**: shared infra has to be designed correctly upfront. We pay
  Phase 0 in calendar time before any user-facing progress shows.
- **Con**: feature-feature cross-cutting concerns (e.g., a hook in
  Bank wanting to invalidate a Yield query) must use feature-flag-gated
  query keys to stay safe.

Full plan: `docs/services-migration-plan.md`. Sections 4–6 list the
slice contents, DoD, risks, mitigations.

---

## ADR-002 — Telemetry stack: Sentry + PostHog from Phase 0
2026-04-27 · Accepted

### Context

The original migration plan (§5.3) deferred Sentry / OpenTelemetry as
"out of scope". CEO review identified this as a structural mistake:
Thomas is solo-dev, ships are tested by external users, and there's no
fallback channel for crash reports. Without telemetry on day 1:

- Crashes only surface when users report them. Many never do.
- No way to verify the rollout pattern (slice flags) actually behaves
  as expected when toggled.
- No session replay → reproducing rare bugs requires guesswork.

### Decision

Adopt **Sentry** (`@sentry/react-native`) for crash + perf monitoring
and **PostHog** (`posthog-react-native`) for events + feature flags +
session replay, both initialised in Phase 0 inside
`app/_layout.tsx`.

Both SDKs use **lazy init**: missing `EXPO_PUBLIC_SENTRY_DSN` /
`EXPO_PUBLIC_POSTHOG_API_KEY` → init is a no-op + `__DEV__` warn. Phase 0
boots without secrets; Thomas populates `.env` when ready.

User identification keyed on `subOrgId` (never email / PII). Cleared on
logout.

### Consequences

- **Pro**: real-time crash visibility from the first build distributed.
- **Pro**: feature flags wired up the day a slice ships.
- **Pro**: session replay lets us reproduce any rare bug (with consent
  banner — TODO Slice 1).
- **Con**: ~1.5h additional Phase 0 work.
- **Con**: PostHog adds ~150KB to the bundle. Acceptable.
- **Con**: privacy implications of session replay → require consent
  before enabling, default off until Slice 1.

---

## ADR-003 — Mopro FFI spike in Phase 0 (de-risk Stealth)
2026-04-27 · Accepted

### Context

The original plan placed the Stealth slice (Umbra + Mopro ZK provers)
at slice 5 (days 13–16). "Stealf" stands for stealth — this slice
*defines* the product. If the native ZK build breaks on the new repo,
discovering it on day 13 means 12 days of work were potentially built
on incompatible architecture choices (polyfills, providers, native
configs).

### Decision

Run a **Mopro spike in Phase 0**: copy `modules/mopro-ffi/` from
front-stealf to stealf-app, run `expo prebuild --clean`, build the iOS
app, and execute one existing proof end-to-end (e.g., the simplest
Umbra prover available).

**Goal**: prove the ZK stack builds and runs on the new repo before
committing 12 days of architecture decisions on top of it.

**Budget**: 1 day. If the build succeeds → continue confident with
the slice plan. If it fails → reconsider strategy (stay on
front-stealf, simplify Mopro integration, or rethink architecture).

The full Stealth slice (UI/UX, hooks wiring, full deposit/withdraw
flow) stays at slice 5. Only the *technical risk* is killed early.

### Consequences

- **Pro**: ZK risk is measured day 1 instead of day 13.
- **Pro**: forces us to wire Metro/babel/native configs early — these
  decisions then constrain (correctly) the slices in between.
- **Con**: Phase 0 grows from 1 day to ~2-2.5 days.
- **Con**: native build issues can be opaque on first encounter; if the
  spike turns into a multi-day rabbit hole, we escalate (DM
  Investigator + Thomas).

---

## ADR-004 — `audit-security.md` v0 in Phase 0
2026-04-27 · Accepted

### Context

The original plan placed `audit-security.md` at the end of Slice 5,
treating security review as a final pass. This inverts the intended
relationship: a security review at the end can only flag problems too
late to refactor cheaply. CEO review reframed it: the security audit
should *guide* the design, not validate it after the fact.

### Decision

Create `docs/audit-security.md` v0 in Phase 0 with:

- **Sensitive surfaces**: passkeys, SecureStore, walletKeyCache,
  signing flows.
- **Secrets map**: what's stored where, with TTL and rotation policy.
- **Light threat model**: who attacks what, how.

Each slice extends the doc at its end: Auth adds passkey/biometric
threats, Bank adds RPC trust assumptions, Send adds tx-replay/dedup,
Grow adds Arcium memo-encryption guarantees, Stealth adds the full
Umbra threat model.

### Consequences

- **Pro**: the doc is fed by real implementations — no "speculative
  security writeup" that ages badly.
- **Pro**: a slice can fail its DoD if it doesn't update the doc.
- **Con**: ~1h of Phase 0 work to seed the v0.

---

## ADR-005 — `useMutation` everywhere, no manual loading state
2026-04-27 · Accepted

### Context

front-stealf relied on the pattern `[loading, setLoading, error,
setError]` inside hooks for write actions. This duplicated the
React Query state machine, leaked state on unmounts, and made
side-effects (toasts, navigation) hard to compose.

### Decision

Every write action is implemented as a `useMutation` from
`@tanstack/react-query`. Side-effects use `onSuccess`/`onError`
callbacks. UI consumes `mutation.isPending`, `mutation.error`.

### Consequences

- **Pro**: consistent surface across features.
- **Pro**: built-in retry, cache invalidation, and request
  deduplication.
- **Con**: requires a `QueryClientProvider` in every test setup that
  exercises hooks.

---

## ADR-006 — Static `app.json` retained (deferred decision on `app.config.js`)
2026-04-27 · Accepted

### Context

`stealf-app` ships with `app.json` (static). `front-stealf` uses
`app.config.js` (dynamic, can read env vars). Sentry's Expo plugin
benefits from `app.config.js` for build-time DSN injection, but works
fine with `app.json` too.

### Decision

Keep `app.json` for now. Add Sentry's `expo` config block and the
`@sentry/react-native/expo` plugin directly in `app.json`. If we need
env-driven config (per-env bundle ID, per-env Turnkey org, etc.) we
migrate to `app.config.js` then — it's a 5-minute change.

### Consequences

- **Pro**: zero churn on the existing config.
- **Con**: build-time secrets must come from `eas.json` env or shell
  env, not `process.env` in JS config.

