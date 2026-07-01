# Glossary

Stealf-specific terms used across the codebase. Generic web/RN/Solana terms
are not duplicated here — link to authoritative docs instead.

The first section below pins the **user-facing copy** — what we say on
screens. Below that, the **codebase reference** documents the technical
terms (most of which never appear in UI strings).

---

## User-facing canonical labels (UI copy contract)

Pinned by Thomas (CEO) on 2026-06-12 ahead of the Big Review polish
(sprint `feat/home-balance-carousel-bigreview`, Sprint 1). Update via PR
review only — anything visible to the user must match the right column.

### Discipline (read first)

The discipline is a hard split: **internal code names stay where they
are.** No `stealfWallet → stealthWallet` migration, no `STEALF_*`
SecureStore key renames, no `src/features/stealth/` folder rename, no
`cashWallet` onboarding-internal rename. Only the **UI strings** move.
Code can keep `stealf` / `stealth` / `shielded` / `moove` / `cashWallet`
mixed; the **UI speaks one language**.

### Style rules

- **Sentence case** for all multi-word UI labels: "Virtual bank account",
  "Encrypted balance", "Recovery phrase". Never "Virtual Bank Account".
- **Tab labels** are sentence case too: "Payment", not "PAYMENT" — even
  when `textTransform: 'uppercase'` styles them. Source must be sentence.
- **Umbra brand**: "Umbra Privacy" everywhere in UI. Never "Umbra
  Protocol", never "privacy pool", never "privacy protocol".
- **Fossile drop**: "cash wallet" / "cash account" never appear in UI.

### Wallets

| Concept | Internal code (DO NOT TOUCH) | UI label canonical |
|---|---|---|
| Public Solana wallet bridged to the virtual bank account + Stealf card | `bankWallet`, `user.bankWallet`, `cashWallet` (legacy onboarding), `cash_wallet` (server) | **Virtual bank account** |
| 2nd Solana wallet, source for private operations, holds public ATA + encrypted balance | `stealfWallet`, `user.stealfWallet`, `STEALF_*` SecureStore keys, `src/features/stealth/`, `useSetupStealfWallet`, `registerStealfWallet` | **Wallet** |

### Balances

| Concept | Internal code (DO NOT TOUCH) | UI label canonical |
|---|---|---|
| The on-chain SOL/USDC sitting in a wallet's public ATAs | `balance`, `useBalance`, `tokens[].balance` | **Balance** (qualifier "Public" only when explicitly contrasted with encrypted) |
| The Umbra-encrypted bucket sitting in the encrypted-balance PDA | `shielded`, `useShieldedSolBalance`, `EncryptedBalance` (Umbra SDK) | **Encrypted balance** |
| A pending UTXO not yet claimed into encrypted balance | `pendingUtxo`, `claim-pending` route | **Pending claim** |

### Tabs

| Concept | Internal code (DO NOT TOUCH) | UI label canonical |
|---|---|---|
| Tab #1 | `'home'` segment | **Home** |
| Tab #2 | `'stealth'` segment | **Payment** (sentence case; copy must say "Payment tab", not "Stealth tab") |
| Tab #3 | `'grow'` segment | **Grow** |
| Tab #4 | `'profile'` segment | **Profile** |

### Verbs / actions

| Concept | Internal code (DO NOT TOUCH) | UI label canonical |
|---|---|---|
| Move public balance → encrypted balance | `shield`, `move-bank-to-shielded`, `ShieldFlow` | **Shield** (CTA) / **Move to private** (modal title context) |
| Move encrypted balance → public balance | `unshield`, `move-shielded-to-bank`, `UnshieldFlow` | **Unshield** (CTA) / **Move to bank** (modal title context) |
| Move SOL between public ATAs you own | `move-stealth-to-bank` | **Move to bank** (modal title) |
| Send WSOL from your encrypted balance to another Stealf user's encrypted balance | `send-private` | **Private send** |
| Claim a pending UTXO | `claim-to-bank`, `claim-to-shielded` | **Claim** |

### Brand / proper nouns

| Concept | Internal code (DO NOT TOUCH) | UI label canonical |
|---|---|---|
| The product / company | n/a | **Stealf** (capital S, no italic) |
| The card | n/a | **Stealf card** |
| The underlying privacy protocol | `umbra`, `@umbra-privacy/sdk` | **Umbra Privacy** (never "Umbra Protocol", never "privacy pool", never "privacy protocol") |
| Recovery material | `mnemonic`, `seedPhrase` (legacy) | **Recovery phrase** (never "seed phrase" in UI) |

### What this glossary explicitly does NOT change

- `stealfWallet` field on `User` (DB + AuthContext + everywhere) — stable, no migration
- `cashWallet` onboarding internal — stable, kept until backend rename ships
- `STEALF_PRIVATE_KEY`, `STEALF_MNEMONIC`, `STEALF_WALLET_ADDRESS` SecureStore keys — stable, changing them resets every existing user's wallet access
- `keychainService: 'com.stealf.wallet'` — stable
- `src/features/stealth/`, `src/features/moove/` folder names — internal, no migration cost but no value to renaming
- `mode: 'private' | 'public'` enum in `PrivacyModeContext` — describes a view, "private" reads fine technically and matches the UI label
- `shielded` / `unshielded` verbs in `PendingOpKind` — internal taxonomy, never shown to user

---

## Codebase reference (technical terms)

The remainder of this document is the technical glossary — terms used in
the codebase that may or may not appear in UI copy. For UI copy, always
follow the canonical labels above; the entries below describe what the
underlying types/symbols *mean*, not what they should be called on screen.

### Wallets & Identity

**Stealf** — The product. Solana neobank with built-in privacy primitives.
Stylized as "stealth + DeFi".

**bankWallet** (`bank_wallet` server-side, `cashWallet` legacy onboarding) —
Turnkey-managed Solana wallet. Signing happens via Turnkey's TEE using the
active session (OAuth or Email-OTP). This is the "public" wallet visible on
on-chain explorers. UI label: **Virtual bank account**.

**stealfWallet** — Local ED25519 wallet. Private key stored in
`expo-secure-store` (Keychain on iOS, Keystore on Android). Used for
non-Turnkey signing paths (privacy ops, mempool obfuscation). UI label:
**Wallet**.

**subOrgId** — Turnkey sub-organization identifier. Sourced from the backend
`userProfile` on session hydration and held in AuthContext React state for
the lifetime of the session. **Not** persisted in SecureStore.

**passkey** — Internal Turnkey credential, **not user-facing**. The UI auth
surface is Google OAuth / Apple OAuth / Email-OTP.

**walletKeyCache** — In-memory cache (15-minute TTL) for the `stealfWallet`
private key, backed by Keychain. Avoids re-prompting biometrics on every op.

### Privacy stack (Umbra)

**Umbra Privacy** — Privacy SDK on Solana. Shielded UTXO model: deposit a
public balance → receive a shielded UTXO; transfer/withdraw consume UTXOs
and emit new ones. Proofs are zk-SNARKs. UI label: **Umbra Privacy** (never
"Umbra Protocol").

**Mopro** — Rust FFI library bundling ZK provers. Compiled to a native
xcframework (iOS) and `.so` (Android), exposed to JS via React Native
bindings. The proof generation lives in Rust for speed; JS only orchestrates.

**zkey** — Circuit-specific proving key (binary). Bundled as Metro asset
(`assetExts.push('zkey')`) or downloaded from CDN with file-system caching.

**shield / unshield** — User-facing CTAs for moving funds **into** the
Umbra privacy pool (deposit → shielded UTXO) or **out of** it (withdraw →
public address).

**EncryptedBalance / shielded** — Sum of unspent UTXO values the local
wallet can decrypt. Computed client-side after fetching ciphertexts from
the relayer. UI label: **Encrypted balance**.

**claim** — A pending UTXO addressed to the user that hasn't been swept
yet. Two flavors:
- *pending claim* — UTXO waiting to be ingested into the local wallet state.
- *pending claim for bank* — UTXO marked for unshield to `bankWallet` on
  next user action.

**send-private** — Umbra `transfer` operation. Both sender and recipient
balances stay shielded.

**master seed** — 32-byte seed derived once and stored in Keychain.
Bootstraps all Umbra-side keys (viewing key, spending key).

### Yield (Arcium)

**Arcium** — Confidential compute network on Solana. Computations run
inside an MXE (multi-party execution) cluster; inputs/outputs are encrypted.

**MXE** — Multi-party Execution cluster. The Arcium "runtime" that holds
the public key the client encrypts deposits against.

**mxePubkey** — Public key fetched from the MXE; used by the client with
RescueCipher + x25519 to encrypt the deposit memo.

---

## Design system conventions

### Spacing scale (`src/design-system/spacing.ts`)

Canonical spacing tokens. Name `Sp` (not `S`) because `S` is the widely
used `txPalette('silver')` alias.

| Token | Value | Intent |
|---|---|---|
| `Sp.xs` | 4 | Tight gap inside a tile / between icon and label |
| `Sp.sm` | 8 | Standard inline gap (gap between siblings in a row) |
| `Sp.md` | 12 | Default vertical gap between content blocks |
| `Sp.lg` | 16 | Comfortable padding inside cards / between sections |
| `Sp.xl` | 24 | Default screen horizontal gutter |

Two named gutters live alongside the scale:

- `SCREEN_GUTTER = Sp.xl` (24) — body content horizontal padding.
- `HEADER_GUTTER = 20` — intentional tighter padding on page headers
  (`PageTitleHeader`, `TxHeader`). Kept distinct so header rhythm
  doesn't widen with content.

**Rule** — use the tokens in new code. Existing literal values (18, 20,
22, 24, 28 mixed in feature screens) are grandfathered until touched —
migrate opportunistically when modifying a file, not as a sweep.
