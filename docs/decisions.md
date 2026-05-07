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

Run a **Mopro spike in Phase 0**: vendor the Rust ZK FFI from
front-stealf to stealf-app (later superseded by the standalone npm
package `@umbra-privacy/rn-zk-prover`), run `expo prebuild --clean`,
build the iOS app, and execute one existing proof end-to-end (e.g., the
simplest Umbra prover available).

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

- **Sensitive surfaces**: OAuth/OTP credentials, SecureStore,
  walletKeyCache, signing flows.
- **Secrets map**: what's stored where, with TTL and rotation policy.
- **Light threat model**: who attacks what, how.

Each slice extends the doc at its end: Auth adds OAuth/OTP threats,
Bank adds RPC trust assumptions, Send adds tx-replay/dedup,
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

---

## ADR-007 — `/api/users/check-availability` shape (split rejected)
2026-04-28 · Rejected by CEO 2026-04-28 · **Superseded by ADR-008** (entire
preAuthToken / magic-link / invite-code flow retired)

### Context

Current backend exposes one endpoint that validates `{ email, pseudo,
inviteCode }` atomically and returns `{ canProceed, unavailable[],
errors[], preAuthToken }`. The client today posts it once at the email
step and reads `unavailable` (where `1 = email taken`, `2 = pseudo
taken`).

Two UX problems with the atomic shape:

1. **Pseudo collisions surface late.** The user picks a handle on
   step 1, types an email on step 2, and only then learns the handle
   was taken — they have to back-step and re-pick.
2. **No live availability feedback.** Most modern signups validate
   handles as you type ("✓ available" / "✗ taken"). The atomic
   endpoint cannot serve that without re-running the email check on
   every keystroke.

A naïve fix ("split into `/check-email` + `/check-pseudo`") misses
the third concern: **probing email existence is an enumeration
attack vector**. If a public endpoint returns "email taken", anyone
can build a list of registered users.

### Decision (proposed)

Split into three endpoints with distinct semantics:

| Endpoint | When called | Auth | Notes |
|---|---|---|---|
| `POST /api/users/check-invite` | Step 0 submit | none (rate-limited) | Validate the invite code is real and consumable. No availability info. |
| `GET /api/users/check-pseudo?v=X` | Step 1, debounced 300ms | none (rate-limited) | Live "available / taken" only. Rate-limit per IP and per session token. |
| `POST /api/users/start-onboarding` | Step 2 submit | none (rate-limited + invite token) | Atomic: validate `{ email, pseudo, inviteCode }` together, send magic link, return `preAuthToken`. **Email taken** is treated as a generic "unable to start" with no enumeration leak — magic link is sent silently as if the request succeeded, server-side flags the conflict for support to reach out. |

The `start-onboarding` endpoint preserves the current
preAuthToken/polling flow downstream. Only the upstream UX changes.

### Consequences

- **Pro**: pseudo collisions caught live → no back-stepping.
- **Pro**: email enumeration attack surface eliminated (no
  endpoint distinguishes "email taken" from "email available").
- **Pro**: `check-pseudo` is the only endpoint hit live → easy to
  isolate and rate-limit per-IP without affecting other flows.
- **Con**: 3 backend endpoints to ship + tests instead of 1.
- **Con**: `start-onboarding` silently masks email collisions →
  needs a server-side audit log + a support escalation path.
### CEO verdict (2026-04-28) — Rejected

Splitting introduces real costs the proposal underweighted:

- A `onboardingStep: 1|2|3` state machine in Redis to enforce
  in-order validation.
- Race conditions: invite code revoked between step 1 and step 3.
- JWT plumbing between the three endpoints (the invite token
  threaded through pseudo/email steps).
- Validation logic duplicated across endpoints.

The current `/check-availability` endpoint already takes optional
fields and validates them in isolation. Per-step UX is achievable
**from the front-end** by calling the same endpoint with one field
at a time (e.g. live pseudo check by posting only `{ pseudo }`).

**Decision**: keep one endpoint. Granularity lives in the front.
If a real UX need emerges later that the single endpoint cannot
serve, revisit as a stateful Redis session with mandatory in-order
validation — but start simple.

### Slice 1 impact

None. The current `features/onboarding/api/onboarding.ts`
implementation already calls `/check-availability` once at the
email step. No code change required.

A future micro-improvement (out of scope for Slice 1): add a
debounced live pseudo check to step 1 by posting
`{ pseudo: handle }` and surfacing "✓ available" / "✗ taken"
inline. Frontend-only, ~30 min.

---

## ADR-008 — Auth: OAuth (Google/Apple) + Email-OTP via Turnkey
2026-05-02 · Accepted

### Context

The Phase-0 onboarding flow (`/check-availability` + magic-link email +
preAuthToken polling + invite-code gate) was retired. The new auth surface
delegates identity to Turnkey: Google/Apple OAuth or Email-OTP, both via
`@turnkey/react-native-wallet-kit`.

### Decision

- **OAuth path**: `tk.handleGoogleOauth` / `tk.handleAppleOauth`. The
  provider-level `onAuthenticationSuccess` callback (configured at
  `<TurnkeyProvider>` mount, not per-call) decodes the OIDC `email` claim
  client-side and emits it via `oauthAuthEvents` — `useAuthFlow` subscribes
  and finalises signup with the bank wallet derived from the Turnkey session.
- **Email-OTP path**: standard Turnkey OTP flow, no client-side decode.
- **Backend signup payload**: `{ authMethod, sessionToken, email,
  bankWallet, pseudo }`. `authMethod` collapses to `oauth | email`,
  inferred server-side from the Turnkey session type — never client-asserted.
- **Returning user**: backend short-circuits via `subOrgId` lookup before
  any `email`/`pseudo` check; OAuth providers that don't re-emit the email
  claim (Apple private relay) still resolve to the existing account.

### Supersedes

- The atomic `/check-availability` endpoint and ADR-007 split debate.
- The `magicLinkController` / preAuthToken polling flow.
- The invite-code gate (currently gated behind a placeholder; not part of
  the auth path itself).
- All `passkey`-as-user-facing-credential framing.

### Consequences

- **Pro**: zero custom auth surface — Turnkey owns the identity round-trip.
- **Pro**: bank wallet derives 1-to-1 from the Turnkey sub-org, no extra
  binding required.
- **Pro**: no email enumeration via signup endpoint (returning short-circuit
  hides the conflict signal).
- **Con**: callback-as-trigger pattern requires careful documentation —
  the SDK's `params.onOauthSuccess` is dead code for Google/Apple; only
  `callbacks.onAuthenticationSuccess` fires (cf. `oauthAuthEvents.ts`).
- **Con**: Apple private relay returning users without an email claim
  surface a softened error UX ("Try Email or Google") rather than a
  resolution path. Acceptable until production data shows otherwise.

