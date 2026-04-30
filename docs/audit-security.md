# Security audit (v0 — Phase 0)

Living document. Each slice extends this with its own threat model and
mitigations at slice DoD time. v0 is the seed — bare-bones surface map
+ lightweight threats, no exhaustive review.

**Status**: v0, seeded in Phase 0. Next update: end of Slice 1 (Auth
adds passkey/biometric threats).

---

## 1. Sensitive surfaces

Areas where a defect or attacker action causes loss of funds, loss of
privacy, or impersonation.

### 1.1 Passkey & Turnkey signing (Slice 1)
- Passkey is the root of authority for `bankWallet`. Loss of all
  passkeys = loss of bank funds (no recovery without server-side
  social recovery, not implemented).
- Signing is brokered by Turnkey. Trust assumption: Turnkey's TEE
  honesty.
- Surface: `services/turnkey/config.ts`, `services/turnkey/signer.ts`,
  `features/onboarding/hooks/useSignIn.ts`, `useSignUp.ts`.

### 1.2 SecureStore (`expo-secure-store`)
- Stores: `stealfWallet` private key (ED25519 32-byte seed), `subOrgId`.
- Backing: iOS Keychain (`kSecAttrAccessibleAfterFirstUnlock`),
  Android Keystore (encrypted at rest with hardware-backed key when
  available).
- Threat: device compromise (rooted/jailbroken) ⇒ key extractable.
  Mitigation v0: nothing on jailbreak detection — TBD Slice 1.
- Surface: `services/auth/secureStore.ts`.

### 1.3 walletKeyCache (`services/cache/walletKeyCache.ts`)
- 15-minute RAM cache of `stealfWallet` key after biometric unlock.
  Avoids re-prompting on every signing op.
- Cleared on logout, app backgrounding (TBD), and TTL expiry.
- Threat: process introspection if attacker has device access. Same
  category as 1.2.

### 1.4 Signing flows
- **Bank send** (Turnkey): client builds tx, Turnkey signs after
  passkey assertion. Tx is broadcast by client.
- **Stealf send** (local): walletKeyCache → ED25519 sign → broadcast.
- **Yield deposit**: stealfWallet signs a transfer + memo
  instruction; memo is encrypted Arcium-side.
- **Umbra deposit/withdraw/transfer**: stealfWallet signs; ZK proof
  from Mopro; relayer submits.
- Threat shared by all: pre-flight validation (`transactionsGuard`)
  must reject malformed inputs before signing — never sign untrusted
  bytes.

### 1.5 Network transport
- API: HTTPS to `EXPO_PUBLIC_API_URL`. Bearer token = Turnkey-signed
  JWT.
- Socket: `socket.io` over WSS to API origin. Authenticated with the
  same bearer.
- Solana RPC: HTTPS to `EXPO_PUBLIC_SOLANA_RPC_URL`. WSS to
  `EXPO_PUBLIC_SOLANA_WSS_URL`. Anyone observing the RPC sees public
  txs (no privacy implication for cash; privacy implication for
  shielded txs handled by Umbra design).
- Threat: cert pinning not done. Acceptable for v0 (TLS already
  hardened by OS), reconsider before mainnet.

### 1.6 ZK provers (Mopro, Slice 5)
- Compiled Rust → native xcframework (iOS) / `.so` (Android).
- Inputs (witnesses) include the spending key. Provers must run
  in-process; never serialise witnesses out.
- Threat: a malicious or buggy circuit could generate a valid proof
  for a different statement. Mitigation: pin circuit hashes,
  download `.zkey` only over HTTPS from trusted CDN.

### 1.7 Logout
- Must clear: AuthContext state, SecureStore (`stealfWallet`,
  `subOrgId`), walletKeyCache, React Query cache, socket connection,
  Turnkey session, Sentry user scope, PostHog identification, Umbra
  master seed.
- Surface: `useAuth().logout` (Slice 1). Test: relogin yields a clean
  state with no leftover query data.

---

## 2. Secrets & data inventory

| What                               | Storage                                  | TTL / Rotation               | Notes                                            |
|------------------------------------|------------------------------------------|------------------------------|--------------------------------------------------|
| `stealfWallet` private key (32B)   | SecureStore (Keychain / Keystore)        | Until logout / app uninstall | Single-device. No backup yet.                    |
| `subOrgId`                         | SecureStore                              | Until logout                 | Cached for cold-start; authoritative = Turnkey.  |
| Turnkey session token              | Turnkey SDK in-memory                    | Per Turnkey policy           | Refreshed by Turnkey lifecycle.                  |
| API bearer (JWT)                   | Same as Turnkey session                  | Same                         | Re-signed when needed.                           |
| Passkey credential                 | Platform passkey storage (iCloud / Google)| Per OS policy                | Out of our control.                              |
| Master seed (Umbra, Slice 5)       | Keychain (separate item)                 | Until logout / uninstall     | Derives all Umbra-side keys.                     |
| Sentry DSN                         | `.env` (`EXPO_PUBLIC_SENTRY_DSN`)        | Manual rotation              | Public-ish; meant to be embedded.                |
| PostHog API key                    | `.env`                                    | Manual rotation              | Public-ish; meant to be embedded.                |
| Solana RPC URL                     | `.env`                                    | Manual rotation              | If rate-limited, swap RPC.                       |
| `walletKeyCache` (RAM)             | RAM only                                 | 15 min TTL + logout / bg     | Never persisted.                                 |

**Server-side secrets** (Turnkey API key, RPC private endpoint, etc.)
live on the backend. Out of scope of this client-side audit.

---

## 3. Threat model (light)

Sketched for v0. Each slice fleshes out its own quadrant.

### Adversary types

| #  | Adversary                  | Capability                                                   | Goal                                    |
|----|----------------------------|--------------------------------------------------------------|-----------------------------------------|
| A1 | Device thief (no passcode) | Physical access; phone unlocked or trivial passcode          | Steal funds via UI                      |
| A2 | Device thief (rooted)      | Same as A1 + root/jailbreak                                  | Extract SecureStore                     |
| A3 | Network adversary          | MITM on the user's connection                                | Read/modify API/socket traffic          |
| A4 | Backend compromise         | Stealf backend pwned                                         | Steal funds via Turnkey impersonation   |
| A5 | Turnkey compromise         | Turnkey breach                                               | Forge signatures on bank wallets        |
| A6 | Malicious dApp / link      | User opens hostile deep link                                 | Trick into signing                      |
| A7 | RPC provider               | Solana RPC operator                                          | Censor txs / leak metadata              |
| A8 | Curious observer           | Reads on-chain data                                          | Deanonymise users                       |

### Mitigation status (v0)

| Adversary | v0 mitigation                                                                                                | Slice owner    |
|-----------|--------------------------------------------------------------------------------------------------------------|----------------|
| A1        | Biometric prompt on signing actions (Turnkey + walletKeyCache).                                              | Slice 1        |
| A2        | None for v0. SecureStore alone (hardware-backed where available). TBD: jailbreak detection.                  | Slice 1 / TBD  |
| A3        | TLS only. No cert pinning.                                                                                   | Slice 2 / TBD  |
| A4        | Limited: even a malicious backend can't sign without a fresh passkey assertion. `stealfWallet` unaffected.   | Slice 1        |
| A5        | Out of our control. `bankWallet` exposure = full. `stealfWallet` unaffected.                                 | n/a            |
| A6        | Deep-link routing only goes through `app/` Expo Router routes — no eval / dynamic code.                      | Slice 1        |
| A7        | Single RPC config. Acceptable for v0; multi-RPC fallback later.                                              | Slice 2 / TBD  |
| A8        | `bankWallet` is fully public. `stealfWallet` uses Umbra for privacy (Slice 5).                               | Slice 5        |

---

## 4. Open TODOs

Updated at slice DoD time.

- [ ] Slice 1 — extend §1.1 with full passkey lifecycle (creation,
      multi-passkey, recovery), add §A1 mitigation details, log out
      checklist test.
- [ ] Slice 1 — decide on jailbreak/root detection (`react-native-jail-monkey`?).
- [ ] Slice 1 — consent flow for PostHog session replay.
- [ ] Slice 2 — RPC failover, NetInfo-aware error states, cert pinning.
- [ ] Slice 3 — pre-sign tx validation guard tests + threat scenarios
      (auto-send, balance overflow, mnemonic injection).
- [ ] Slice 4 — Arcium MXE pubkey provenance / pinning. Memo replay
      protection (nonce uniqueness check).
- [ ] Slice 5 — full Umbra threat model: relayer trust, circuit
      pinning, viewing key handling, master seed backup story,
      anonymity set.
- [ ] Cross-cutting — formalise the "logout invariants" test.
- [ ] Pre-mainnet — third-party security review of the privacy stack.

---

## 6. Known issues — to fix before dev/prod

Issues caught during review of the auth-hardening + Slice 1/2/3 work.
Tracked here so they don't slip; status updated at fix time.

### 6.1 SendFlow gold tone signs from bank wallet, not stealth wallet
**Severity**: 🔴 high (loss-of-funds confusion)
**Status**: open, blocks Slice 5 ship
**Surface**: `src/features/send/SendFlow.tsx:80,114,217`

When the user taps "Send" from `StealthHub` with `?tone=gold`, the UI
applies the gold palette but reads `useBalance(user.bankWallet)` and
signs with `fromAddress: user.bankWallet`. The user thinks they're
sending from stealth, but it's actually a bank send with cosmetic
gold styling. Pre-existing from Slice 5b/5c — not introduced this
session, but visible in interaction with the new Send flow.

**Fix**: branch `bankWallet` vs `stealfWallet` selection on `tone`,
swap balance source to `useEncryptedBalances` for gold, wire the
Umbra signing path instead of `useSendSimple`. Slice 5 work proper.

### 6.2 Onboarding email lookup uses legacy plaintext column
**Severity**: 🟡 medium (silent breakage when migration window closes)
**Status**: open, blocks legacy `email` column drop
**Surface**: `backend-stealf/src/controllers/onboardingController.ts:152`

```ts
const taken = await User.findOne({ email });  // legacy plaintext
```

Security Officer added `emailHash` (HMAC-SHA256 indexed) +
`emailEncrypted` (AES-256-GCM at-rest) so the plaintext `email`
column can be dropped. The uniqueness check still queries the
plaintext column. As long as `createUser` populates both, this
works — but the day the legacy column is dropped, this query
returns `null` for every email and duplicate registrations slip
through silently.

**Fix**: switch to `User.findOne({ emailHash: hashEmail(email) })`
in both `OnboardingController.email` (line 152) and
`OnboardingController.resendCode` if it queries email at all.
`hashEmail` is already exported from `src/utils/emailCrypto.ts`.

### 6.3 EMAIL_TAKEN 409 reverses the anti-enumeration intent
**Severity**: 🟡 medium (security trade-off, documented choice)
**Status**: accepted trade-off, this is the canonical record

The original Security Officer design returned `200 success: true`
silently when the submitted email was already registered, with a
600 ms timing pad. This defeated email enumeration: an attacker
couldn't tell from the response whether a given email was already
on the platform.

We reverted that to an explicit `409 EMAIL_TAKEN` because the silent
path broke onboarding UX (user proceeds to the verify-code screen
expecting a code that never arrives). The trade-off is acceptable
for Stealf because:

- Stealf is **invite-gated**. To probe the email enumeration oracle,
  an attacker would need a valid invite code per probe. Invite codes
  are scarce and trackable.
- Stealf is **pre-launch / closed beta**. Attacker incentive is low
  versus public mainnet apps.

**Reconsider before**: opening invite codes to public registration,
or any time the invite-gating is loosened. At that point either
revert to silent-200 or move enumeration defense further upstream
(rate-limit per IP, captcha on `/email`, etc.).

Implemented in `feat/auth-hardening` commit `dcd8f4e`.

### 6.4 No tests on the realtime layer
**Severity**: 🟡 medium (caught a silent bug last week)
**Status**: open, ~30 min of work, high ROI
**Surface**: `src/features/bank/api/subscriptions.ts`,
`src/services/real-time/socket.ts`

The `transaction:new` / `balance:updated` handlers, the cache-key
shape, and `socket.onReconnect()` invalidation have zero tests. A
mismatched cache key (`limit=4` read vs `limit=10` write) silently
dropped live updates for two commits before being caught
manually — a 20-line vitest mocking `socketService.on(...)` would
have flagged it on first commit.

**Fix**: add tests covering (a) `setQueryData` lands on the same
key `useHistory` reads, (b) self-address mismatch is filtered, (c)
the reconnect callback fires `invalidateQueries` for the right
keys.

### 6.5 `'#E5484D'` raw hex in 5+ places instead of token
**Severity**: 🟢 low (cosmetic / DS hygiene)
**Status**: open, ~10 min
**Surface**: `src/features/send/SendFlow.tsx` (4 occurrences),
`src/features/onboarding/OnboardWizard.tsx` (1 occurrence)

Error red is hardcoded as `'#E5484D'`. Should be promoted to a
shared token (e.g. `T.danger` or `palette.danger`) so a future
palette tweak doesn't require a grep-and-replace.

---

## 5. Glossary

Defined in `glossary.md`. Cross-references rather than duplications.
