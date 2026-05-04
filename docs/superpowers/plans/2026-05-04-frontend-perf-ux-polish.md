# Frontend perf + UX polish sprint — `feat/frontend-perf-ux-polish`

**Branch base**: `phase-0-foundation` (HEAD `965862f`, post merge of PR #1).
**Estimated**: ~13h, 6 chantiers split into 2 phases (perf, then UX) + glossary gate before rename.

## Goals

1. **Cut Release-build splash time** — kill eager preloads that block the splash hide.
2. **Stop bundling 49.5MB of zkey into the app binary** — defer userRegistration zkey to first-use download.
3. **Stop hammering the manifest endpoint** on every proof — in-memory cache.
4. **Surface form errors with a unified primitive** — `<FormError>` + `T.error` token.
5. **Stop using `Alert.alert` for non-destructive notifications** — route through `PendingOpsPill`.
6. **Glossary-driven rename of privacy-related vocabulary** — gated on CEO Review ack of the glossary.

## Hors-scope (strict)

- Onboarding screens (Staff Engineer parallel sprint).
- Mega-screen refactors (P2).
- `BalanceVisibilityContext` move.
- Umbra U64 cast wrap.
- AppState listener / re-auth biometric reveal (deferred per CEO/Thomas decision in P0 audit §6.10/6.11).

## Chantier 1 — Perf release-killers (~5h)

### 1.1 — Lazy-load `userregistration.zkey` (49.5MB)

**Site**: `src/features/stealth/zk/services/zkAssetService.ts:22-25`

```ts
const BUNDLED_ZKEYS: Partial<Record<ZKeyType, number>> = {
  userRegistration: require('@/assets/zk/userregistration.zkey'),  // ← drop this entry
  createDepositWithPublicAmount: require('@/assets/zk/createdepositwithpublicamount.zkey'),  // keep (~8MB, hot path)
};
```

**Approach**:
- Drop `userRegistration` from `BUNDLED_ZKEYS` so the asset is no longer Metro-required at boot.
- Update `isZKeyAvailable(type, variant)` and `getBundledZKeyUri(type)` so `userRegistration` is fetched from CDN via `downloadZKey` on first registration call.
- Verify `localOrDownloadZKey` already falls through to `downloadZKey` when no bundled URI is found (it does — line 229-234).
- **Verify the asset still ships in the CDN manifest** — read the deploy script / S3 layout. If `userRegistration` is not in the remote manifest, this change breaks first-time registration → block until backend confirms.
- Move `assets/zk/userregistration.zkey` to a sub-folder excluded from the bundle (or simply delete it locally, but keep `createdepositwithpublicamount.zkey`).
- Measure: `expo run:ios --configuration Release` → ipa size before vs after. Log in commit body.

**Risk**: First registration on a fresh install needs network. Acceptable per CEO Review brief (registration is not first-action — onboarding does it post-auth, with network already proven).

### 1.2 — Drop logo/passkey from `PRELOAD_IMAGES` + re-export @3x

**Site**: `app/_layout.tsx:41-48` + `assets/images/logo.png` + `assets/images/passkey.png`

```ts
const PRELOAD_IMAGES = [
  require('../assets/images/passkey.png'),  // ← drop, used only on PasskeyAuthScreen
  require('../assets/images/logo.png'),     // ← drop, used only on splash + login
  require('../assets/images/splash-icon.png'),  // keep (splash)
  require('../assets/images/usdc.png'),         // keep (hub, hot path)
  require('../assets/images/solana-icon.png'),  // keep (hub, hot path)
  require('../assets/images/card-stealf.png'),  // keep (hub, hot path)
];
```

**Approach**:
- Remove `passkey.png` and `logo.png` from preload list.
- Verify the screens that consume them (`PasskeyAuthScreen`, `Splash`, login screens) handle the cold-load gracefully via `<Image>` placeholder or skeleton.
- **Re-export logo + passkey at @3x density** (or as `.svg` if vector) — current PNG sizes might force runtime rasterization. Use design source.
- Measure splash hide time with `expo run:ios --configuration Release` (Dev mode is mensonge per CEO Review). Log timestamps via Pino-style log in `_layout.tsx`.

### 1.3 — Memoize ZK provers + cache manifest fetch

**Sites**:
- `src/features/stealth/zk/services/zkAssetService.ts:81-87` (manifest fetch)
- `src/features/stealth/zk/services/zkAssetService.ts:108-136` (validate on every `getZKey`)
- `src/features/stealth/zk/provers/register.ts`, `createUtxos.ts`, `claimsUtxos.ts` (provers)

**Approach (manifest)**:
```ts
let manifestCache: { data: ZkAssetManifest; expiresAt: number } | null = null;
const MANIFEST_TTL_MS = 5 * 60 * 1000;

export async function fetchRemoteManifest(): Promise<ZkAssetManifest> {
  if (manifestCache && manifestCache.expiresAt > Date.now()) {
    return manifestCache.data;
  }
  const url = `${ZK_MANIFEST_URL}?t=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ZK manifest: ${response.status}`);
  const data = await response.json();
  manifestCache = { data, expiresAt: Date.now() + MANIFEST_TTL_MS };
  return data;
}
// Export a `clearManifestCache()` for tests / clearZkAssetsCache.
```

**Approach (provers)**:
- For each prover factory, lift the `getZKey` call OUT of the per-call `prove` closure — resolve once on first `prove`, cache the path inside the closure.
- Pattern:
  ```ts
  export function createClaimEphemeralZkProver(zkLib = Zk) {
    let zkeyPathPromise: Promise<string> | null = null;
    const getPath = () => zkeyPathPromise ??= getZKey('claimDepositIntoPublicAmount', 'n1');
    return {
      maxUtxoCapacity: 1,
      prove: async (inputs: unknown) => {
        const zkeyPath = await getPath();
        return createZkProver(zkeyPath, zkLib).prove(inputs);
      },
    };
  }
  ```
- Same shape for `createCreateUtxoWith*ZkProver` x4 in `createUtxos.ts`.
- For `createUserRegistrationProver` (already async, resolves on construction) — fine as-is, just verify it's not re-constructed on every render.
- `createClaimReceiverZkProver` is parameterized by `nLeaves` — memoize per-`nLeaves` (Map<n, Promise<string>>).

**Tests**:
- Unit: `manifestCache` honored when called twice within TTL, refreshed after expiry, cleared by `clearZkAssetsCache`.
- Unit: Each prover factory calls `getZKey` exactly once across N `prove` invocations.

## Chantier 2 — UX polish (~8h)

### 2.1 — `<FormError>` primitive + `T.error` token

**Approach**:
- Read `src/design-system/tokens.ts` to confirm whether `T.error` already exists. If not, add `error: '#FF453A'` (iOS system red) — confirm in Figma if present.
- Create `src/design-system/components/FormError.tsx`:
  ```tsx
  export function FormError({ message }: { message: string | null }) {
    if (!message) return null;
    return <Text style={{ color: T.error, fontFamily: T.font.mono, fontSize: 13 }}>{message}</Text>;
  }
  ```
- Migrate inline error renders across forms (search for `color: 'red'`, `color: '#FF...'`, inline error Text patterns).
- Snapshot tests for the primitive.

### 2.2 — Replace `Alert.alert` with `PendingOpsPill` in non-destructive flows

**Approach**:
- Grep `Alert.alert` usages.
- Categorize: destructive (confirm dismissal, irreversible actions) → keep `Alert.alert`. Non-destructive (success toast, "transaction submitted", "copied") → route through `PendingOpsPill`.
- Update each call site, drop the redundant `Alert.alert` import where applicable.

### 2.3 — Glossary-driven rename **(GATED)**

**Step A — Glossary draft** (this sprint):
- Write `docs/glossary.md`. Cover: `private/public`, `shield/unshield`, `encrypted balance`, `stealth`, `confidential`, `ephemeral`, `receiver-claimable`, etc. with current usage, recommended usage, and rationale.
- DM the glossary to CEO Review.
- **HARD STOP** — wait for CEO Review ack with Thomas's product validation before touching code.

**Step B — Global rename** (post-ack, separate commit cluster):
- Rename strings, keys, copy. NOT identifiers (TypeScript types, function names) unless trivially safe.
- One commit per concept renamed (e.g. `chore(copy): rename 'encrypted balance' → 'private balance'`).
- Run e2e UI smoke before pushing.

## Verification gates

- TS strict: `npm run typecheck` clean after every chantier.
- Tests: `npm test` clean. New tests for 1.3 (manifest cache + prover memoization).
- iOS Release build splash time: log baseline before 1.1, log post-1.2 measurement. Both numbers in PR description.
- IPA size: log before/after 1.1 in PR description.

## Open questions (resolved before starting)

- ✅ `userRegistration` zkey is in the CDN manifest? **Verify before dropping the bundled copy** — ask CEO Review to confirm or check S3 directly.
- ✅ Stray uncommitted change in `StealthHub.tsx` (5 lines, `setMode('public')` after registration) — out of scope for this sprint, ask Thomas where to land it.

## Sequencing

1. Audit boot path + verify CDN manifest contains `userRegistration` zkey
2. Plan ack from Thomas
3. Chantier 1.1 → 1.2 → 1.3 (one commit each, verify between)
4. Chantier 2.1 → 2.2
5. DM `docs/glossary.md` → wait ack
6. Chantier 2.3
7. Open PR `feat/frontend-perf-ux-polish` → `phase-0-foundation`
