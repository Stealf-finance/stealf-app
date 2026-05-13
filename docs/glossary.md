# Glossary

Stealf-specific terms used across the codebase. Generic web/RN/Solana terms
are not duplicated here — link to authoritative docs instead.

The first section below pins the **user-facing copy** — what we say on
screens. Below that, the **codebase reference** documents the technical
terms (most of which never appear in UI strings).

---

## User-facing canonical labels (UI copy contract)

Pinned by Thomas (CEO) on 2026-05-04 ahead of the global rename
(sprint `feat/frontend-perf-ux-polish`, chantier 2.3). Update via PR
review only — anything visible to the user must match the right column.

### Why this section exists

We currently ship 3 different labels for the same concept (`Encrypted balance`
/ `Shielded pool` / `Private balance`) and 2 different verbs for the same
action (`Shield` / `Move to private`). Users can't tell whether `Shielded
pool` and `Encrypted balance` are the same bucket — and they are.

The discipline is a hard split: **internal code names stay where they are**
(no `stealfWallet → stealthWallet` migration, no `STEALF_*` SecureStore key
renames, no `src/features/stealth/` folder rename). Only the UI strings
move. Code can keep `stealf` / `stealth` / `shielded` mixed; the **UI
speaks one language**.

### Wallets

| Concept | Internal code name | User-facing label | Notes |
|---|---|---|---|
| Public Solana wallet, bridged to virtual bank accont + Stealf card | `bankWallet`, `user.bankWallet` | **Bank wallet** | No change. |
| 2nd Solana wallet, source for private operations, holds public ATA + encrypted balance | `stealfWallet`, `user.stealfWallet`, `STEALF_*` SecureStore keys, `src/features/stealth/`, `useSetupStealfWallet`, `registerStealfWallet` | **Stealth wallet** | 🔒 **Locked by Thomas.** Code keeps `stealfWallet` everywhere; UI says "Stealth wallet" everywhere. |

### Balances

| Concept | Internal code name | User-facing label | Notes |
|---|---|---|---|
| The on-chain SOL/USDC sitting in a wallet's public ATAs | `balance`, `useBalance`, `tokens[].balance` | **Public balance** when contrasted with encrypted; plain **Balance** otherwise | Most surfaces just say "Balance" + a number. The qualifier "Public" only appears when explicitly contrasted with encrypted. |
| The Umbra-encrypted bucket sitting in the encrypted-balance PDA | `shielded`, `useShieldedSolBalance`, `EncryptedBalance` (Umbra SDK) | **Encrypted balance** | ⚠️ **Rename target.** Currently labeled `Shielded pool` in `MoveFlow.tsx:74,79`. Needs to become `Encrypted balance` to match `SendFlow.tsx:125`. |
| A pending UTXO not yet claimed into encrypted balance | `pendingUtxo`, `claim-pending` route | **Pending claim** (existing) | No change. |

### Verbs / actions

| Concept | Internal code name | User-facing label | Notes |
|---|---|---|---|
| Move SOL from `bankWallet` public balance → `stealfWallet` encrypted balance | `shield`, `move-bank-to-shielded`, `ShieldFlow` | **Shield** (CTA, pill) / **Move to private** (modal title) | Both stay. `Shield` is the noun on the action tile + pill. `Move to private` is the modal-title context. They describe the same op. |
| Move WSOL from `stealfWallet` encrypted balance → `bankWallet` public balance | `unshield`, `move-shielded-to-bank`, `UnshieldFlow` | **Unshield** (CTA, pill) / **Move to bank** (modal title) | Same dual pattern as Shield. |
| Move SOL from `stealfWallet` public ATA → `bankWallet` public ATA (no encryption involved) | `move-stealth-to-bank` | **Move to bank** (modal title) | Distinct from Unshield — never touches encrypted balance, just an SPL transfer between two public ATAs you own. User sees "Move to bank" in both cases; underlying source is determined by which wallet they tap. |
| Send WSOL from your encrypted balance to another Stealf user's encrypted balance | `send-private`, `Sending` / `Sent` in pill | **Private send** | No change. |
| Claim a pending UTXO into bank or encrypted balance | `claim-to-bank`, `claim-to-shielded` | **Claim** (CTA) | No change. |

### Privacy & modes

| Concept | Internal code name | User-facing label | Notes |
|---|---|---|---|
| StealthHub carousel side showing public balance + activity | `mode: 'public'` (PrivacyModeContext) | **Public** | Describes a *view*, not a wallet. |
| StealthHub carousel side showing encrypted balance + private activity | `mode: 'private'` | **Private** | Describes a *view*. |
| The 0.30% Umbra protocol fee on shield/unshield/private-send | `PROTOCOL_FEE_RATE`, `protocolFeeSol()` | **Privacy fee** | No change. |
| Hide the dollar value with bullet pips (UX privacy, not crypto privacy) | `balanceHidden`, `useBalanceVisibility` | **Hide balance** / **Show balance** | Distinct from "Private" — applies to bank balance too. |

### Brand / proper nouns

| Concept | Internal code name | User-facing label | Notes |
|---|---|---|---|
| The product / company | n/a | **Stealf** | Capital-S, no italic. |
| The card | n/a | **Stealf card** | No change. |
| The underlying privacy protocol | `umbra`, `@umbra-privacy/sdk` | Not user-facing — never surfaced in UI copy | Internal only. |

### Étape B — concrete rename work

Once this section is acked, the following code changes are in scope:

| File | Line(s) | Change |
|---|---|---|
| `src/features/moove/MoveFlow.tsx` | 74 | `'Shielded pool'` → `'Encrypted balance'` (toLabel for `bank-to-shielded`) |
| `src/features/moove/MoveFlow.tsx` | 79 | `'Shielded pool'` → `'Encrypted balance'` (fromLabel for `shielded-to-bank`) |

That's the whole rename — 2 string changes, 1 file. Everything else
already uses canonical labels (verified via grep: `'Stealth wallet'` in
6 user-facing call-sites, `'Encrypted balance'` already in
`SendFlow.tsx:125`, `'Bank wallet'` consistent across the app, etc.).

The reason the étape feels small: most of the inconsistency is **internal
vs UI** drift, not UI vs UI drift. Once we nail "code keeps `stealfWallet`
/ `shielded`, UI says `Stealth wallet` / `Encrypted balance`", there's
almost nothing left to chase.

### What this glossary explicitly does NOT change

- `stealfWallet` field on `User` (DB + AuthContext + everywhere) — stable, no migration
- `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `STEALF_WALLET_ADDRESS` SecureStore keys — stable, changing them resets every existing user's wallet access
- `keychainService: 'com.stealf.wallet'` — stable, same reason
- `src/features/stealth/` folder name — internal, no migration cost but no value to renaming
- `mode: 'private' | 'public'` enum in `PrivacyModeContext` — describes a view, "private" reads fine technically and matches the UI label
- The `shielded` / `unshielded` verbs in `PendingOpKind` — internal taxonomy, never shown to user (pill formats them as `Shield`/`Unshield` via `VERBS` map)
- "Stealf" as the brand

### Open questions for Thomas

1. **"Move to private" vs "Move to encrypted"** — modal title for `bank-to-shielded` currently reads `Move to private`. Two arguably-correct options:
   - **(a)** Keep `Move to private` (what users *intend* — moving funds into the private side of the app)
   - **(b)** Tighten to `Move to encrypted balance` (what *literally* happens — funds become AES-encrypted state)
   - **Recommendation: (a).** User-intent framing is more honest about what privacy buys them. (b) makes us sound like a technical demo.
2. **"Stealth wallet" plural** — when we say "your wallets", we mean both bank + stealth (one of each per user, since `user.stealfWallet` is singular). If multi-stealth-wallet ships later, "your wallets" needs to be re-disambiguated. No work today, just flagging.

---

## Codebase reference (technical terms)

The remainder of this document is the technical glossary — terms used in
the codebase that may or may not appear in UI copy. For UI copy, always
follow the canonical labels above; the entries below describe what the
underlying types/symbols *mean*, not what they should be called on screen.

---

## Wallets & Identity

**Stealf** — The product. Solana neobank with built-in privacy primitives.
Stylized as "stealth + DeFi".

**bankWallet** (`bank_wallet` server-side) — Turnkey-managed Solana wallet.
Signing happens via Turnkey's TEE using the active session (OAuth or
Email-OTP). This is the "public" wallet visible on-chain explorers.

**stealfWallet** — Local ED25519 wallet. Private key stored in
`expo-secure-store` (Keychain on iOS, Keystore on Android). Used for
non-Turnkey signing paths (privacy ops, mempool obfuscation).

**subOrgId** — Turnkey sub-organization identifier. Persisted client-side in
SecureStore for cold-start hydration. Source of truth: Turnkey SDK.

**passkey** — Internal Turnkey credential, **not user-facing**. The UI auth
surface is Google OAuth / Apple OAuth / Email-OTP. Earlier docs that frame
passkey as a user-visible primitive are pre-refactor history.

**walletKeyCache** — In-memory cache (15-minute TTL) for the `stealfWallet`
private key, backed by Keychain. Avoids re-prompting biometrics on every op.

---

## Privacy stack (Umbra + Mopro)

**Umbra** — Privacy SDK on Solana. Shielded UTXO model: deposit a public
balance → receive a shielded UTXO; transfer/withdraw consume UTXOs and emit
new ones. Proofs are zk-SNARKs.

**Mopro** — Rust FFI library bundling ZK provers. Compiled to a native
xcframework (iOS) and `.so` (Android), exposed to JS via React Native
bindings (`MoproReactNativeBindings`). The proof generation lives in Rust
for speed; JS only orchestrates.

**zkey** — Circuit-specific proving key (binary). Bundled as Metro asset
(`assetExts.push('zkey')`) or downloaded from CDN with file-system caching.

**shield / unshield** — User-facing terms for moving funds **into** the
Umbra privacy pool (deposit → shielded UTXO) or **out of** it (withdraw →
public address).

**shielded balance** — Sum of unspent UTXO values the local wallet can
decrypt. Computed client-side after fetching ciphertexts from the relayer.

**claim** — A pending UTXO addressed to the user that hasn't been swept
yet. Two flavors:
- *pending claim* — UTXO waiting to be ingested into the local wallet state.
- *pending claim for bank* — UTXO marked for unshield to `bankWallet` on
  next user action.

**send-private** — Umbra `transfer` operation. Both sender and recipient
balances stay shielded.

**burnt UTXO** — UTXO already spent locally but not yet acknowledged
on-chain. Tracked to prevent double-spend during proof generation.

**master seed** — 32-byte seed derived once and stored in Keychain.
Bootstraps all Umbra-side keys (viewing key, spending key).

---

## Yield (Arcium)

**Arcium** — Confidential compute network on Solana. Computations run
inside an MXE (multi-party execution) cluster; inputs/outputs are encrypted.

**MXE** — Multi-party Execution cluster. The Arcium "runtime" that holds
the public key the client encrypts deposits against.

**mxePubkey** — Public key fetched from the MXE; used by the client with
RescueCipher + x25519 to encrypt the deposit memo.

**RescueCipher** — Symmetric cipher used by Arcium for memo encryption
(authenticated, zk-friendly).

**deposit memo** — Encrypted blob (u128 amount LE + nonce) attached to a
yield deposit transaction so the MXE can decrypt server-side and credit
the user's confidential balance.

**Jito / JitoMark** — Yield is sourced via Jito MEV redistribution. The
"JitoMark" label in the UI signals MEV-backed yield.

---

## App-internal terms

**moove** — Internal name for the "send" entry point in the bottom tab
bar. Surfaces both cash and private send flows.

**DataBootstrap** — Top-level component (no UI) that orchestrates
post-login data flow: prefetch user profile, open socket subscriptions per
feature, register cleanups on logout.

**slice** — Implementation unit in this migration. One slice = one
feature domain (Auth / Bank / Send / Grow / Stealth) shipped end-to-end:
api → hooks → screens wired to real backend.

**feature flag** — PostHog-managed boolean gate per slice
(`slice-<name>-enabled`). Allows server-side killswitch without redeploy.
See `conventions.md`.

**3-layer pattern** — `api/` (pure fns + Zod parse) → `hooks/` (React
Query wrap) → `screens/` (UI consumes hooks). Strict — no shortcuts.

---

## Server-side / Infra

**API** — `EXPO_PUBLIC_API_URL`, REST + bearer-auth (Turnkey-signed JWT).

**Socket** — `socket.io` connection at API origin. One singleton per
session. Authentified via the same bearer.

**Turnkey** — Custodial signing service. Owns the `bankWallet`'s private
key inside its TEEs. Client never sees the private key.

**relayer (Umbra)** — Server endpoint that submits Umbra proofs to chain
on behalf of the client. URL in `EXPO_PUBLIC_UMBRA_RELAYER_URL`.
