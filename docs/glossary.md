# Glossary

Stealf-specific terms used across the codebase. Generic web/RN/Solana terms
are not duplicated here — link to authoritative docs instead.

---

## Wallets & Identity

**Stealf** — The product. Solana neobank with built-in privacy primitives.
Stylized as "stealth + DeFi".

**bankWallet** (`cash_wallet` server-side) — Turnkey-managed Solana wallet.
Signing happens via passkey + Turnkey backend signing service. This is the
"public" wallet visible on-chain explorers.

**stealfWallet** — Local ED25519 wallet. Private key stored in
`expo-secure-store` (Keychain on iOS, Keystore on Android). Used for
non-Turnkey signing paths (privacy ops, mempool obfuscation).

**subOrgId** — Turnkey sub-organization identifier. Persisted client-side in
SecureStore for cold-start hydration. Source of truth: Turnkey SDK.

**passkey** — WebAuthn credential bound to the device. Biometric-protected.
Used by Turnkey to authorize signing on `bankWallet`. One sub-org has one or
more passkeys; loss of all passkeys = loss of `bankWallet`.

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
