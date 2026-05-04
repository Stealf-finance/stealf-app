# Frontend stealf-app P0 Security Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 4 P0 frontend security vulnerabilities — disable PostHog session replay (which records mnemonic/wallet screens), gate irreversible secrets behind biometric in SecureStore, auto-clear the clipboard after copying a recovery phrase, and stop leaking the stealth wallet bs58 private key in the Umbra Keychain service name.

**Architecture:** Single PR on `feat/frontend-p0-security` from `phase-0-foundation`. Each fix = at most 2 commits (impl + tests). Vitest for pure / mockable functions, manual iOS device test for biometric prompt UX. Cold-start prompt count is held to 1 by lazifying `walletKeyCache.warmup()` (drop the two eager bootstrap callers; sign-in / sign-up still call it from a context where the user expects auth). No bootstrap refactor.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-secure-store ~15.0.8, expo-clipboard ~8.0.8, posthog-react-native ^4.43.6 (+ session-replay ^1.5.6), @noble/hashes ^2.2.0 (sha256), Vitest ^4.1.5 (node env, `@` aliased to repo root).

**Out of scope (CEO/Thomas explicit deferral, document don't implement):**
- AppState listener clearing `walletKeyCache` on background.
- Biometric re-auth gate before reveal in `PrivateKeyScreen` (only the clipboard auto-clear is in scope on that screen).

---

## Validated audit findings (CSO check before plan)

1. **PostHog session replay** — `enableSessionReplay: true` confirmed at `app/_layout.tsx:130` (the live path; `<PostHogProvider>` wraps the tree). Same flag also at `src/services/observability/posthog.ts:17` in dead code (`initPostHog` is never called — only `getPostHog()` is, and it returns the provider's client through the SDK's singleton). Flip both to keep them coherent.

2. **SecureStore accessibility** — `src/services/auth/secureStore.ts:5` uses `AFTER_FIRST_UNLOCK` for every key with `requireAuthentication` defaulted to false. Confirms the audit. Cold-start prompt cascade is the real risk: `DataBootstrap.tsx:39` and `AuthContext.tsx:112` BOTH call `walletKeyCache.warmup()` in parallel, and `AuthContext.tsx:90-93` reads `SESSION_TOKEN` at the same time. With `requireAuthentication: true` on PK + SESSION_TOKEN, that's 2 simultaneous Face ID prompts. Mitigation: drop the two eager `warmup()` calls — keep the `warmup` function (still called from `useSignIn:71` + `useSignUp:309` after explicit user auth), and let signing flows (`useSendSimple:98`, `keyDerivation.ts:62`, `umbra/client.ts:40`) lazy-prompt at signing time. Cold start then prompts ONCE for `SESSION_TOKEN`.

3. **Clipboard never cleared** — `PrivateKeyScreen.tsx:233-235` does `Clipboard.setStringAsync(value)` and stops. Affects both bank wallet AND stealth wallet KeyCard `Copy` buttons.

4. **Umbra Keychain leak** — `src/services/umbra/seed.ts:11` defines `setActiveWallet(walletAddress)` but `src/services/umbra/client.ts:45` calls it as `setActiveWallet(privateKeyB58)`. So the service identifier `umbra_master_seed_<safeKey(currentWalletKey)>` ends up containing the bs58 **private key** for the stealth-wallet path. The bank-wallet path at `client.ts:127` correctly passes a wallet address. The brief's mention of `react-native-keychain` was inaccurate — code uses `expo-secure-store`; iOS Keychain enumeration via `SecAccessGroup` is the equivalent leak vector, same risk principle, same fix (hash before storage). Migration must read both new (sha256) and old (raw) service names during the deprecation window.

---

## File Structure

**Modify:**
- `src/services/observability/posthog.ts` — `enableSessionReplay: false`.
- `app/_layout.tsx` — `enableSessionReplay: false` in PostHogProvider options.
- `src/services/auth/secureStore.ts` — per-key sensitivity classification + biometric for HIGH-sensitivity keys; export typed key set.
- `src/components/DataBootstrap.tsx` — drop eager `walletKeyCache.warmup()`.
- `src/features/onboarding/context/AuthContext.tsx` — drop eager `walletKeyCache.warmup()`.
- `src/features/profile/screens/PrivateKeyScreen.tsx` — wire clipboard auto-clear + countdown UX feedback.
- `src/services/umbra/seed.ts` — sha256-hashed service identifier with raw-bs58 fallback for migration; rename param to reflect what callers actually pass.
- `docs/audit-security.md` — section 6 entries for the 4 fixes + 2 deferred items, plus update §1.2 (SecureStore) and §1.3 (walletKeyCache).
- `.gitignore` — add `build/`.

**Create:**
- `src/services/auth/__tests__/secureStore.test.ts` — high vs medium key classification, biometric option presence on HIGH set.
- `src/features/profile/lib/clipboardAutoClear.ts` — pure clipboard auto-clear scheduler.
- `src/features/profile/lib/__tests__/clipboardAutoClear.test.ts` — timer fires, value match → cleared, value mismatch → preserved, cancel before timer → no clear.
- `src/services/umbra/__tests__/seedKey.test.ts` — sha256 deterministic, length 16, different inputs → different keys.

**No file deletions** (`MagicLink`-style cleanup only happens after migration window in a follow-up).

---

## Task 1: Add `build/` to `.gitignore` (~2 min)

This is housekeeping for a clean working tree before we start. The `build/` dir was untracked at branch creation and should never be committed.

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Edit `.gitignore` to ignore the `build/` directory**

Add the following line at the end of the file (preserving existing content):

```
# Native build artifacts
build/
```

- [ ] **Step 2: Verify `git status` is now clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (or only the `.gitignore` modification staged).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore native build/ output"
```

---

## Task 2: Disable PostHog session replay (~15 min)

The PostHog provider at `app/_layout.tsx:125-137` currently enables session replay. The session-replay package (`posthog-react-native-session-replay`) is installed and active, so every screen — including `PrivateKeyScreen` showing a 12-word mnemonic, `StealfWalletSetup`, and `SendFlow` — is being recorded. Flip the flag to `false` in both call sites (the live provider + the dead-code service module) for coherence.

**Files:**
- Modify: `src/services/observability/posthog.ts:17`
- Modify: `app/_layout.tsx:130`

- [ ] **Step 1: Flip `enableSessionReplay` in `src/services/observability/posthog.ts`**

Edit line 17 from:

```ts
    enableSessionReplay: true,
```

to:

```ts
    enableSessionReplay: false,
```

- [ ] **Step 2: Flip `enableSessionReplay` in `app/_layout.tsx`**

Edit line 130 from:

```ts
        enableSessionReplay: true,
```

to:

```ts
        enableSessionReplay: false,
```

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/observability/posthog.ts app/_layout.tsx
git commit -m "fix(security): disable PostHog session replay

Session replay was recording every screen including PrivateKeyScreen
(12-word mnemonic), StealfWalletSetup, SendFlow recipients/amounts,
and Bank/Stealth balances. Re-enabling will require <PostHogPrivateView>
masking around sensitive views — out of scope for this sprint.

Manual action for Thomas: purge existing recordings in PostHog dashboard."
```

---

## Task 3: SecureStore biometric for high-sensitivity keys (~1h30)

Three secrets are irreversible-loss-grade and warrant a biometric gate: `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `SESSION_TOKEN`. The rest of the keys (`STEALF_WALLET_ADDRESS`, `USER_DATA`, `SUB_ORG_ID`, `ONBOARDING_DRAFT`) get a defense-in-depth bump from `AFTER_FIRST_UNLOCK` to `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` (still passcode-required, no biometric prompt). To keep cold-start prompt UX to a single Face ID, we drop the two eager `walletKeyCache.warmup()` calls from `DataBootstrap` and `AuthContext` — sign-in / sign-up still call `warmup()` in a context where the user already authenticated.

**Files:**
- Modify: `src/services/auth/secureStore.ts`
- Modify: `src/components/DataBootstrap.tsx:39`
- Modify: `src/features/onboarding/context/AuthContext.tsx:112`
- Test: `src/services/auth/__tests__/secureStore.test.ts`

- [ ] **Step 1: Write the failing test for key sensitivity classification**

Create `src/services/auth/__tests__/secureStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveOptions, HIGH_SENSITIVITY_KEYS, SECURE_STORE_KEYS } from '../secureStore';

describe('secureStore options', () => {
  it('returns biometric-gated options for high-sensitivity keys', () => {
    for (const key of HIGH_SENSITIVITY_KEYS) {
      const opts = resolveOptions(key);
      expect(opts.requireAuthentication).toBe(true);
      expect(opts.authenticationPrompt).toBeTruthy();
      expect(opts.keychainAccessible).toBeDefined();
    }
  });

  it('returns non-biometric options for routine keys', () => {
    const routine = [
      SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS,
      SECURE_STORE_KEYS.USER_DATA,
      SECURE_STORE_KEYS.SUB_ORG_ID,
      SECURE_STORE_KEYS.ONBOARDING_DRAFT,
    ];
    for (const key of routine) {
      const opts = resolveOptions(key);
      expect(opts.requireAuthentication).toBeFalsy();
      expect(opts.keychainAccessible).toBeDefined();
    }
  });

  it('classifies STEALF_PRIVATE_KEY, STEALF_MNEMONIC, and SESSION_TOKEN as high-sensitivity', () => {
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_MNEMONIC);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.SESSION_TOKEN);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/services/auth/__tests__/secureStore.test.ts`
Expected: FAIL — `resolveOptions` and `HIGH_SENSITIVITY_KEYS` are not yet exported.

- [ ] **Step 3: Implement per-key options in `src/services/auth/secureStore.ts`**

Replace the entire file with:

```ts
import * as SecureStore from 'expo-secure-store';

export const SECURE_STORE_KEYS = {
  STEALF_PRIVATE_KEY: 'stealf_private_key',
  STEALF_MNEMONIC: 'stealf_mnemonic',
  STEALF_WALLET_ADDRESS: 'stealf_wallet_address',
  USER_DATA: 'user_data',
  SESSION_TOKEN: 'session_token',
  SUB_ORG_ID: 'sub_org_id',
  ONBOARDING_DRAFT: 'onboarding_draft',
} as const;

export type SecureStoreKey = typeof SECURE_STORE_KEYS[keyof typeof SECURE_STORE_KEYS];

// Keys whose loss is irreversible (can't re-issue from server). Biometric-gated.
export const HIGH_SENSITIVITY_KEYS: readonly SecureStoreKey[] = [
  SECURE_STORE_KEYS.STEALF_PRIVATE_KEY,
  SECURE_STORE_KEYS.STEALF_MNEMONIC,
  SECURE_STORE_KEYS.SESSION_TOKEN,
];

const BASE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

const HIGH_OPTIONS: SecureStore.SecureStoreOptions = {
  ...BASE_OPTIONS,
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your wallet',
};

export function resolveOptions(key: string): SecureStore.SecureStoreOptions {
  return (HIGH_SENSITIVITY_KEYS as readonly string[]).includes(key)
    ? HIGH_OPTIONS
    : BASE_OPTIONS;
}

export async function setSecure(key: string, value: string): Promise<void> {
  const opts = resolveOptions(key);
  await SecureStore.deleteItemAsync(key, opts).catch(() => undefined);
  await SecureStore.setItemAsync(key, value, opts);
}

export function getSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, resolveOptions(key));
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, resolveOptions(key));
}

export async function setSecureJson<T>(key: string, value: T): Promise<void> {
  await setSecure(key, JSON.stringify(value));
}

export async function getSecureJson<T>(key: string): Promise<T | null> {
  const raw = await getSecure(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/services/auth/__tests__/secureStore.test.ts`
Expected: PASS — all three test cases green.

- [ ] **Step 5: Run TypeScript build**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Drop eager `walletKeyCache.warmup()` from `DataBootstrap.tsx`**

Edit `src/components/DataBootstrap.tsx` line 39, remove:

```ts
    void walletKeyCache.warmup();

```

The line above (lines 33-37, the `__DEV__` log) and below (line 41+, the `prefetchQuery` block) stay as-is. Also remove the now-unused import on line 3:

```ts
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
```

- [ ] **Step 7: Drop eager `walletKeyCache.warmup()` from `AuthContext.tsx`**

Edit `src/features/onboarding/context/AuthContext.tsx`. Remove lines 110-112:

```ts
        // Pre-load the stealth signing key into RAM so the first signing op
        // on this session doesn't pay the Keychain hit.
        void walletKeyCache.warmup();
```

Also remove the now-unused import on line 18:

```ts
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
```

- [ ] **Step 8: Verify TypeScript still compiles after removing the imports**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: all suites green.

- [ ] **Step 10: Commit**

```bash
git add src/services/auth/secureStore.ts src/services/auth/__tests__/secureStore.test.ts \
        src/components/DataBootstrap.tsx src/features/onboarding/context/AuthContext.tsx
git commit -m "fix(security): biometric-gate irreversible secrets in SecureStore

STEALF_PRIVATE_KEY, STEALF_MNEMONIC, SESSION_TOKEN now require Face ID /
device biometric to read (requireAuthentication: true) and are gated by
WHEN_PASSCODE_SET_THIS_DEVICE_ONLY (was AFTER_FIRST_UNLOCK). Lower-sensitivity
keys keep PASSCODE_SET_THIS_DEVICE_ONLY without biometric.

Cold-start UX: drop the two eager walletKeyCache.warmup() calls
(DataBootstrap, AuthContext bootstrap). Signing flows already lazy-load PK,
sign-in/sign-up still warm the cache. Cold start now prompts once for
SESSION_TOKEN; PK + mnemonic prompts gated to actual sensitive actions."
```

---

## Task 4: Clipboard auto-clear in PrivateKeyScreen (~1h)

Both bank-wallet and stealth-wallet KeyCard `Copy` buttons currently leave the mnemonic on the system clipboard indefinitely (Universal Clipboard broadcasts to all iCloud-paired Apple devices). Schedule a 30 s timer that reads the current clipboard and clears it only if it still matches the value we wrote — never overwriting user content. Surface the countdown in the existing "Copied" toast so users understand the behaviour.

**Files:**
- Create: `src/features/profile/lib/clipboardAutoClear.ts`
- Test: `src/features/profile/lib/__tests__/clipboardAutoClear.test.ts`
- Modify: `src/features/profile/screens/PrivateKeyScreen.tsx`

- [ ] **Step 1: Write the failing test for the clipboard auto-clear utility**

Create `src/features/profile/lib/__tests__/clipboardAutoClear.test.ts`:

```ts
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const getStringAsync = vi.fn<() => Promise<string>>();
const setStringAsync = vi.fn<(value: string) => Promise<boolean>>();

vi.mock('expo-clipboard', () => ({
  getStringAsync: (...args: unknown[]) => getStringAsync(...(args as [])),
  setStringAsync: (value: string) => setStringAsync(value),
}));

import { scheduleClipboardClear } from '../clipboardAutoClear';

describe('scheduleClipboardClear', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getStringAsync.mockReset();
    setStringAsync.mockReset();
    setStringAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the clipboard after the configured delay when value still matches', async () => {
    getStringAsync.mockResolvedValue('secret-mnemonic');
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).toHaveBeenCalledTimes(1);
    expect(setStringAsync).toHaveBeenCalledWith('');
  });

  it('does not clear the clipboard when the user has copied something else', async () => {
    getStringAsync.mockResolvedValue('user-copied-something-else');
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).toHaveBeenCalledTimes(1);
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  it('cancels the timer when cancel() is called before delay elapses', async () => {
    getStringAsync.mockResolvedValue('secret-mnemonic');
    const cancel = scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });
    cancel();

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(getStringAsync).not.toHaveBeenCalled();
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  it('swallows clipboard read errors without throwing', async () => {
    getStringAsync.mockRejectedValue(new Error('clipboard unavailable'));
    scheduleClipboardClear('secret-mnemonic', { delayMs: 30_000 });

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.resolve();

    expect(setStringAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/features/profile/lib/__tests__/clipboardAutoClear.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `clipboardAutoClear.ts`**

Create `src/features/profile/lib/clipboardAutoClear.ts`:

```ts
import * as Clipboard from 'expo-clipboard';

export interface ClipboardClearOptions {
  delayMs: number;
}

/**
 * Schedule a clipboard wipe after `delayMs`. The wipe only runs if the
 * clipboard still holds the value we copied — if the user has copied
 * something else in the meantime, we leave it alone. Returns a cancel
 * fn to stop the timer (call on unmount or when superseded).
 */
export function scheduleClipboardClear(
  copiedValue: string,
  { delayMs }: ClipboardClearOptions,
): () => void {
  const handle = setTimeout(() => {
    void (async () => {
      try {
        const current = await Clipboard.getStringAsync();
        if (current === copiedValue) {
          await Clipboard.setStringAsync('');
        }
      } catch {
        // Clipboard read failed (permission, platform issue) — leave clipboard alone.
      }
    })();
  }, delayMs);

  return () => clearTimeout(handle);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/features/profile/lib/__tests__/clipboardAutoClear.test.ts`
Expected: PASS — 4/4 cases.

- [ ] **Step 5: Wire the auto-clear + countdown UX into `PrivateKeyScreen.tsx`**

Edit `src/features/profile/screens/PrivateKeyScreen.tsx`:

(a) Add the import at the top of the imports block (after the existing `walletKeyCache` import):

```ts
import { scheduleClipboardClear } from '@/src/features/profile/lib/clipboardAutoClear';
```

(b) Bump the existing constant `CLIPBOARD_CLEAR_DELAY_MS = 30_000;` after the imports (above `const S = txPalette('silver');`):

```ts
const CLIPBOARD_CLEAR_DELAY_MS = 30_000;
```

(c) Replace the entire `KeyBlock` component's local `copied` state hook + reset effect (currently `const [copied, setCopied] = useState(false);` and the `useEffect` that resets it after 1500 ms) with a longer-lived "copied" state that mirrors the clear delay AND triggers the auto-clear. Find this block (around line 377-383):

```ts
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
```

Replace with:

```ts
  const [copied, setCopied] = useState(false);
  const clearTimerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!copied) return;
    const labelTimer = setTimeout(() => setCopied(false), CLIPBOARD_CLEAR_DELAY_MS);
    return () => clearTimeout(labelTimer);
  }, [copied]);

  useEffect(() => {
    return () => {
      clearTimerRef.current?.();
    };
  }, []);
```

(d) Add `useRef` to the React import at the top of the file. Find `import { useEffect, useState } from 'react';` and change to:

```ts
import { useEffect, useRef, useState } from 'react';
```

(e) Replace `handleCopy` (around line 482-485) with the version that schedules the clear:

```ts
  const handleCopy = async () => {
    await onCopy(state.value);
    clearTimerRef.current?.();
    clearTimerRef.current = scheduleClipboardClear(state.value, {
      delayMs: CLIPBOARD_CLEAR_DELAY_MS,
    });
    setCopied(true);
  };
```

(f) Update the `Copy` button label so the user knows the clipboard will clear. Find the `<Text>` block inside the copy button (around line 514-530, which renders `{copied ? 'Copied' : 'Copy'}`). Replace the children with:

```tsx
              {copied ? 'Copied — clears in 30s' : 'Copy'}
```

- [ ] **Step 6: Run TypeScript build**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 7: Run lint**

Run: `npm run lint`
Expected: zero warnings on the touched files.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: all suites green.

- [ ] **Step 9: Commit**

```bash
git add src/features/profile/lib/clipboardAutoClear.ts \
        src/features/profile/lib/__tests__/clipboardAutoClear.test.ts \
        src/features/profile/screens/PrivateKeyScreen.tsx
git commit -m "fix(security): clipboard auto-clear after copying recovery phrase

Scheduling a 30s timer after copying a mnemonic/private key on
PrivateKeyScreen. Timer reads the clipboard before clearing; if the user
has copied something else in the meantime we leave it alone. Cancellation
on component unmount and on subsequent copies. UI label now reads
'Copied — clears in 30s' so the behaviour is visible.

Reveal flow itself unchanged (re-auth biometric on reveal explicitly out
of scope for this sprint per CEO/Thomas decision)."
```

---

## Task 5: Hash Umbra master-seed Keychain identifier (~45 min)

`createMasterSeedStorage(walletAddress)` and the singleton `setActiveWallet(...)` build the Keychain service identifier directly from the input string, which is documented as `walletAddress` but in practice receives the bs58 stealth-wallet **private key** at `client.ts:45`. Hash the input with sha256 and use the first 16 hex chars as the identifier. Existing seeds stored under the raw identifier must remain readable for ~1 week, so the load path tries the new key first, falls back to the legacy raw key, and migrates on read (re-store under hashed key + delete legacy entry).

**Files:**
- Modify: `src/services/umbra/seed.ts`
- Test: `src/services/umbra/__tests__/seedKey.test.ts`

- [ ] **Step 1: Write the failing test for the key-hash util**

Create `src/services/umbra/__tests__/seedKey.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashWalletForServiceKey, buildLegacyServiceKey, buildHashedServiceKey } from '../seed';

describe('Umbra seed Keychain key', () => {
  it('hashWalletForServiceKey returns a 16-char hex string', () => {
    const hash = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hashWalletForServiceKey is deterministic', () => {
    const a = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    const b = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    expect(a).toBe(b);
  });

  it('different inputs produce different hashes', () => {
    const a = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    const b = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qW');
    expect(a).not.toBe(b);
  });

  it('buildHashedServiceKey embeds the hash, not the raw input', () => {
    const raw = '5JUYrwoLXjzpqwkLMmWuP3qV';
    const key = buildHashedServiceKey(raw);
    expect(key).not.toContain(raw);
    expect(key).toMatch(/^umbra_master_seed_[0-9a-f]{16}$/);
  });

  it('buildLegacyServiceKey reproduces the pre-migration identifier (sanitised raw input)', () => {
    const raw = '5JUYrwoL/XjzpqwkLMmWuP3qV';
    const legacy = buildLegacyServiceKey(raw);
    expect(legacy).toBe('umbra_master_seed_5JUYrwoL_XjzpqwkLMmWuP3qV');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/services/umbra/__tests__/seedKey.test.ts`
Expected: FAIL — exports don't exist.

- [ ] **Step 3: Rewrite `src/services/umbra/seed.ts` with hashing + migration fallback**

Replace the entire file with:

```ts
import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

const MASTER_SEED_KEY_PREFIX = 'umbra_master_seed_';

// Plaintext-input fallback is read for ~1 week post-deploy so existing
// users don't lose their stealth seed when they update. Remove after
// 2026-05-11 once telemetry confirms no migrations remain.
const LEGACY_FALLBACK_REMOVE_AFTER = '2026-05-11';

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let currentWalletInput: string | null = null;

/**
 * Bind the storage to a wallet identity. Callers historically pass a bs58
 * private key (stealth) OR a public wallet address (bank). Either way we
 * hash before using it as the Keychain service identifier so the raw
 * value never leaks via Keychain enumeration.
 */
export function setActiveWallet(walletInput: string | null | undefined) {
  currentWalletInput = walletInput || null;
}

function safeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function hashWalletForServiceKey(walletInput: string): string {
  return bytesToHex(sha256(walletInput)).slice(0, 16);
}

export function buildHashedServiceKey(walletInput: string): string {
  return `${MASTER_SEED_KEY_PREFIX}${hashWalletForServiceKey(walletInput)}`;
}

export function buildLegacyServiceKey(walletInput: string): string {
  return `${MASTER_SEED_KEY_PREFIX}${safeKey(walletInput)}`;
}

async function loadWithMigration(walletInput: string) {
  const newKey = buildHashedServiceKey(walletInput);
  try {
    const stored = await SecureStore.getItemAsync(newKey, KEYCHAIN_OPTIONS);
    if (stored) {
      const seed = Uint8Array.from(Buffer.from(stored, 'base64'));
      return { exists: true as const, seed };
    }
  } catch {
    // fall through to legacy lookup
  }

  // Legacy fallback — kept until LEGACY_FALLBACK_REMOVE_AFTER.
  const legacyKey = buildLegacyServiceKey(walletInput);
  try {
    const legacyStored = await SecureStore.getItemAsync(legacyKey, KEYCHAIN_OPTIONS);
    if (!legacyStored) return { exists: false as const };

    // Migrate: re-store under the hashed key, then delete the legacy entry.
    await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
    await SecureStore.setItemAsync(newKey, legacyStored, KEYCHAIN_OPTIONS);
    await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);

    const seed = Uint8Array.from(Buffer.from(legacyStored, 'base64'));
    return { exists: true as const, seed };
  } catch {
    return { exists: false as const };
  }
}

async function storeAtHashedKey(walletInput: string, seed: Uint8Array) {
  const newKey = buildHashedServiceKey(walletInput);
  const encoded = Buffer.from(seed).toString('base64');
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
  await SecureStore.setItemAsync(newKey, encoded, KEYCHAIN_OPTIONS);
  // Best-effort: clear any legacy entry so it doesn't drift out of sync.
  const legacyKey = buildLegacyServiceKey(walletInput);
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);
}

export const masterSeedStorage = {
  async load() {
    if (!currentWalletInput) return { exists: false as const };
    return loadWithMigration(currentWalletInput);
  },

  async store(seed: Uint8Array) {
    if (!currentWalletInput) {
      return { success: false as const, error: 'No active wallet' };
    }
    try {
      await storeAtHashedKey(currentWalletInput, seed);
      return { success: true as const };
    } catch (e) {
      return { success: false as const, error: String(e) };
    }
  },
};

/**
 * Clear the master seed for the currently active wallet only. Other wallets'
 * seeds are preserved so they remain decryptable after a wallet switch.
 */
export async function umbraClearSeed(): Promise<void> {
  if (!currentWalletInput) return;
  const newKey = buildHashedServiceKey(currentWalletInput);
  const legacyKey = buildLegacyServiceKey(currentWalletInput);
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);
}

/**
 * Build a master seed storage scoped to a specific wallet identity (e.g. the
 * bank wallet) without touching the global `currentWalletInput`. Used by the
 * bank-wallet UmbraClient so its seed reads/writes never collide with the
 * stealth wallet storage.
 */
export function createMasterSeedStorage(walletInput: string) {
  return {
    async load() {
      return loadWithMigration(walletInput);
    },
    async store(seed: Uint8Array) {
      try {
        await storeAtHashedKey(walletInput, seed);
        return { success: true as const };
      } catch (e) {
        return { success: false as const, error: String(e) };
      }
    },
  };
}

export const __TEST_ONLY__ = { LEGACY_FALLBACK_REMOVE_AFTER };
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/services/umbra/__tests__/seedKey.test.ts`
Expected: PASS — 5/5 cases.

- [ ] **Step 5: Run TypeScript build**

Run: `npx tsc --noEmit`
Expected: zero errors. (Buffer is a global in RN; the `buffer` polyfill is already in deps.)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all suites green.

- [ ] **Step 7: Commit**

```bash
git add src/services/umbra/seed.ts src/services/umbra/__tests__/seedKey.test.ts
git commit -m "fix(security): hash Umbra master-seed Keychain service identifier

The stealth-wallet path passes a bs58 private key into setActiveWallet (param
is named walletAddress but the caller at umbra/client.ts:45 passes the PK).
That meant the Keychain service identifier 'umbra_master_seed_<bs58_PK>'
exposed the raw private key via iOS Keychain enumeration.

Replace the raw input with the first 16 hex chars of sha256(input). Reads
fall back to the legacy raw-input key during a ~1 week migration window
and migrate-on-read (re-store hashed, delete legacy). Drop the fallback
after 2026-05-11."
```

---

## Task 6: Audit doc update + final QA (~30 min)

Mark the four fixes closed in `docs/audit-security.md`, document the two explicitly-deferred items, and update the relevant inline sections (§1.2 SecureStore accessibility levels, §1.3 walletKeyCache eager-warmup removal). Then run the full DoD check (lint + tsc + tests) and prepare PR notes.

**Files:**
- Modify: `docs/audit-security.md`

- [ ] **Step 1: Update §1.2 (SecureStore) backing description**

In `docs/audit-security.md`, find the §1.2 SecureStore block and replace the "Backing" line with the new accessibility levels and the biometric-gated key list. Find:

```md
- Backing: iOS Keychain (`kSecAttrAccessibleAfterFirstUnlock`),
  Android Keystore (encrypted at rest with hardware-backed key when
  available).
```

Replace with:

```md
- Backing: iOS Keychain (`kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
  for all keys, plus `requireAuthentication: true` on the high-sensitivity
  set), Android Keystore (encrypted at rest with hardware-backed key when
  available).
- High-sensitivity keys (Face ID / device biometric required to read):
  `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `SESSION_TOKEN`. Other keys
  read silently, gated only by passcode-set-on-device.
```

- [ ] **Step 2: Update §1.3 (walletKeyCache) bootstrap description**

In §1.3, find:

```md
- 15-minute RAM cache of `stealfWallet` key after biometric unlock.
  Avoids re-prompting on every signing op.
```

Replace with:

```md
- 15-minute RAM cache of `stealfWallet` key after biometric unlock.
  Avoids re-prompting on every signing op. `walletKeyCache.warmup()`
  is no longer called from `<DataBootstrap>` or `<AuthProvider>` boot
  effects (would have prompted a redundant Face ID at cold start);
  warmup runs only after explicit sign-in / sign-up. Signing flows
  read lazily and prompt at action time.
```

- [ ] **Step 3: Append the four fix entries + two deferred entries to §6 (Known issues)**

At the end of `docs/audit-security.md` (after §6.5), append:

```md
### 6.6 PostHog session replay recorded sensitive screens
**Severity**: 🔴 high (mnemonic + amounts + recipients leak in replays)
**Status**: ✅ resolved on `feat/frontend-p0-security`
**Surface**: `app/_layout.tsx:130`, `src/services/observability/posthog.ts:17`

`enableSessionReplay: true` was capturing every screen including
`PrivateKeyScreen` (12-word mnemonic), `StealfWalletSetup`, `SendFlow`,
and Bank/Stealth balances. Flipped both call sites to `false`. Re-enabling
will require `<PostHogPrivateView>` masking around sensitive views — out of
scope for this sprint.

**Manual action — Thomas**: purge existing recordings in the PostHog dashboard.

### 6.7 SecureStore: irreversible secrets readable without biometric
**Severity**: 🔴 high (device thief who unlocks once after reboot can extract)
**Status**: ✅ resolved on `feat/frontend-p0-security`
**Surface**: `src/services/auth/secureStore.ts`, `src/components/DataBootstrap.tsx:39`,
`src/features/onboarding/context/AuthContext.tsx:112`

All keys moved from `AFTER_FIRST_UNLOCK` to `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`.
`STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `SESSION_TOKEN` additionally require
`requireAuthentication: true` (Face ID prompt on every read). Cold-start UX
preserved by removing the two eager `walletKeyCache.warmup()` calls — sign-in
/ sign-up still warm the cache; signing flows read PK lazily.

**Manual action — Thomas**: rotate `EXPO_PUBLIC_*` env vars only if telemetry
suggests in-flight session leakage; rotation isn't strictly required for this
fix.

### 6.8 Clipboard left mnemonic indefinitely after copy
**Severity**: 🔴 high (Universal Clipboard broadcasts to iCloud devices)
**Status**: ✅ resolved on `feat/frontend-p0-security`
**Surface**: `src/features/profile/screens/PrivateKeyScreen.tsx`,
`src/features/profile/lib/clipboardAutoClear.ts` (new)

After copying a recovery phrase or private key, schedule a 30 s timer that
reads the current clipboard and clears it iff it still matches the value we
wrote (so we never overwrite content the user has copied since). UI surfaces
the countdown ("Copied — clears in 30s"). Reveal flow itself unchanged
(re-auth biometric on reveal deferred — see §6.10).

### 6.9 Umbra Keychain service id leaked stealth wallet bs58 PK
**Severity**: 🔴 high (raw private key visible via Keychain enumeration)
**Status**: ✅ resolved on `feat/frontend-p0-security`
**Surface**: `src/services/umbra/seed.ts`

`setActiveWallet(walletAddress)` was being called with the bs58 stealth-wallet
private key (`umbra/client.ts:45`). The service identifier
`umbra_master_seed_<safeKey(input)>` therefore embedded the raw PK. Now
hashed: `umbra_master_seed_<sha256(input).hex.slice(0,16)>`. Read path falls
back to the legacy raw-input identifier for ~1 week (migrate on read), then
the fallback is dropped after 2026-05-11.

### 6.10 Deferred — AppState listener clearing walletKeyCache on background
**Severity**: 🟡 medium (RAM key remains while app backgrounded)
**Status**: deferred per CEO/Thomas decision (not implemented in
`feat/frontend-p0-security`)

Adding an `AppState` listener that calls `walletKeyCache.clear()` on background
was considered. Choice was made to leave the 15 min TTL as the only RAM-clear
trigger so users don't pay a re-auth on every app switch. Revisit if the threat
model changes (e.g. shoulder-surfing reports, foreground-app inspection
attacks).

### 6.11 Deferred — Biometric re-auth before mnemonic reveal
**Severity**: 🟡 medium (cooperative UX has no second factor at reveal time)
**Status**: deferred per CEO/Thomas decision (not implemented in
`feat/frontend-p0-security`)

`PrivateKeyScreen` reveal currently gates on a checkbox-acknowledge modal
("I understand sharing my private key…"). The clipboard auto-clear (§6.8)
mitigates the largest leak vector. A biometric re-auth on reveal could be
added if compliance / threat model requires. Not implemented this sprint.
```

- [ ] **Step 4: Run the full DoD checks**

Run all three in parallel (or sequentially if your shell prefers):
```bash
npm run lint
npx tsc --noEmit
npm test
```

Expected:
- `lint`: zero warnings
- `tsc`: zero errors
- `vitest`: all suites green

- [ ] **Step 5: Commit doc updates**

```bash
git add docs/audit-security.md
git commit -m "docs(audit): record P0 frontend fixes 6.6–6.9 + 6.10–6.11 deferrals

- 6.6 PostHog session replay disabled
- 6.7 SecureStore biometric-gated for irreversible secrets
- 6.8 Clipboard auto-clear after copying recovery phrase
- 6.9 Umbra master-seed Keychain identifier hashed
- 6.10 AppState background-clear of walletKeyCache (deferred)
- 6.11 Biometric re-auth before mnemonic reveal (deferred)

Section 1.2 SecureStore accessibility level + biometric set updated.
Section 1.3 walletKeyCache eager-warmup removal documented."
```

- [ ] **Step 6: Push branch and open PR**

```bash
git push -u origin feat/frontend-p0-security
gh pr create --base phase-0-foundation --title "Frontend P0 security: PostHog replay off, SecureStore biometric, clipboard auto-clear, Umbra Keychain hash" --body "$(cat <<'EOF'
## Summary

Closes 4 P0 vulnerabilities surfaced by the CEO frontend audit:

1. **PostHog session replay disabled** (`app/_layout.tsx`, `posthog.ts`).
   Was recording mnemonic, send recipients/amounts, balances. Re-enabling
   blocked on a `<PostHogPrivateView>` masking pass — out of scope.
2. **SecureStore biometric-gated irreversible secrets** (`secureStore.ts`).
   `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `SESSION_TOKEN` now require
   Face ID on every read. All keys moved off `AFTER_FIRST_UNLOCK` →
   `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`. Cold-start dual-prompt avoided by
   dropping eager `walletKeyCache.warmup()` from `DataBootstrap` and
   `AuthContext`; signing flows are already lazy.
3. **Clipboard auto-clear** (`PrivateKeyScreen`, new `clipboardAutoClear`
   util). 30 s timer reads the clipboard before clearing; user-copied
   content is left alone. Label updated to "Copied — clears in 30s".
4. **Umbra master-seed Keychain hashed** (`umbra/seed.ts`). Stealth path
   was leaking bs58 PK in the service identifier. Now `sha256(input)
   .hex.slice(0,16)`. Migration fallback reads legacy keys for ~1 week,
   migrate-on-read; remove after 2026-05-11.

Deferred per CEO/Thomas decision: AppState background-clear of
`walletKeyCache`, biometric re-auth before mnemonic reveal. Documented
in `docs/audit-security.md` §6.10 / §6.11.

## Manual actions for Thomas

- [ ] Purge existing PostHog session recordings in the dashboard
      (sensitive screens were captured before this fix lands).
- [ ] Confirm migration fallback removal date (2026-05-11) in the
      sprint follow-up calendar.

## Test plan

- [ ] `npm run lint` — zero warnings.
- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm test` — all suites green (new tests:
      `secureStore.test.ts`, `clipboardAutoClear.test.ts`,
      `seedKey.test.ts`).
- [ ] Manual iOS device test: cold start prompts Face ID **once** for
      `SESSION_TOKEN`; navigating to Send / Stealth Send prompts a
      second time for `STEALF_PRIVATE_KEY`; reveal on `PrivateKeyScreen`
      copies → label "Copied — clears in 30s" → after 30 s the system
      clipboard is empty (verify by pasting in Notes).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

---

## Self-review checklist

- [x] Spec coverage:
  - Fix #1 PostHog → Task 2 ✅
  - Fix #2 SecureStore biometric → Task 3 (covers all 3 keys, lazy warmup mitigation) ✅
  - Fix #3 Clipboard auto-clear → Task 4 ✅
  - Fix #4 Umbra hash → Task 5 ✅
  - Audit doc updated → Task 6 ✅
  - `build/` gitignored → Task 1 ✅
  - Two deferred items documented → Task 6 §6.10 §6.11 ✅
- [x] No placeholders: every step has the literal code/diff to apply.
- [x] Type consistency: `HIGH_SENSITIVITY_KEYS`, `resolveOptions`, `scheduleClipboardClear`, `hashWalletForServiceKey`, `buildHashedServiceKey`, `buildLegacyServiceKey` are all defined in their respective task and used consistently in tests + audit doc.
- [x] DoD covered: lint, tsc, tests, manual device test, PR description with manual Thomas actions.
