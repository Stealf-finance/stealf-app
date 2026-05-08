# Umbra integration in Stealf

This document covers the three Colosseum requirements — Problem &
target users, How Stealf uses the Umbra SDK, and Build/test/use — in
depth. For the higher-level project pitch, see [`README.md`](README.md).

---

## 1. Problem, target users, use cases

**Problem.** On-chain balances on Solana are public by default. Anyone
with a wallet address can read your full transaction history, your
salary, your savings, and the counterparties of every payment. Users
moving real money on Solana need a privacy layer that doesn't force
them to give up self-custody and doesn't route through a centralized
mixer.

**Target users.** EU users who want a Solana-native neobank with an
optional encrypted balance per transaction. They keep custody (the
stealth wallet's private key stays in iOS Keychain), they get a EUR
IBAN and a Stealf card, and they can choose, per transaction, whether
to settle on the public Solana balance or on Umbra's encrypted balance.

**Use cases.**

1. **Private payroll → savings.** Receive salary into the Bank wallet
   (USDC on a public Solana account) → Shield into the Stealth wallet's
   encrypted balance → savings sit off-chain-readable. Block explorers
   no longer see the running balance.
2. **IBAN cash-out from encrypted balance.** Unshield from the
   encrypted balance back to the Bank wallet's public balance → off-ramp
   to EUR via the Stealf card. The on-chain trail breaks at the
   encrypted balance: the cash-out is uncorrelated with the original
   inflow.
3. **P2P private send between Stealf users.** Stealth wallet A holds
   encrypted USDC → sends to Stealth wallet B's encrypted balance via
   an Umbra UTXO transfer. Amount and recipient identity are not
   on-chain visible. The Umbra relayer pays the fee so neither party
   needs SOL on the involved address.

---

## 2. How Stealf uses the Umbra SDK

### Two wallets, two clients, two signers

Stealf provisions two distinct wallets per user:

- **Bank wallet** — Solana account custodied by Turnkey. The private key
  lives inside Turnkey's TEE; the client never sees it. All bank-wallet
  Solana transactions are signed remotely via Turnkey's signing API.
- **Stealth wallet** — local ED25519 keypair. Private key bytes stored
  in iOS Keychain via `expo-secure-store` and cached at runtime in
  `walletKeyCache` (15-minute TTL).

`UmbraClient` instances are built per wallet via Umbra's
`getUmbraClient` factory. Stealf maintains two:

- `getStealthClient()` (`src/services/umbra/client.ts:94-103`, builder
  at `:36-86`) — primary client for the encrypted balance flows. Signer
  is the local ED25519 stealth key, wrapped via
  `createSignerFromPrivateKeyBytes` from `@umbra-privacy/sdk`.
- `getBankClient()` (`src/services/umbra/client.ts:127-161`) — used
  when an Umbra operation must be signed by the bank wallet (typical
  case: deposit from the bank's public USDC balance into a
  receiver-claimable UTXO destined for a stealth recipient). Signer is
  the Turnkey custodial signer.

The bank-wallet signer adapter is a custom bridge:
`createTurnkeyUmbraSigner` (`src/services/umbra/turnkeySigner.ts:1-40`)
implements Umbra's `IUmbraSigner` interface on top of Turnkey's
`signTransaction` and `signMessage` APIs. The adapter serialises the
SignableTransaction to wire format, sends the bytes to Turnkey for
remote signing, and decodes the response back into a SignedTransaction.

### Primitives consumed from `@umbra-privacy/sdk`

- **Registration.** `getUserRegistrationFunction` paired with a custom
  prover from `@umbra-privacy/rn-zk-prover` (see
  `src/features/stealth/lib/registration.ts:1-49`). Both wallets get
  registered on Umbra's `EncryptedUserAccount` PDA on first use.
- **Deposit (public → encrypted).**
  `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` —
  `src/services/umbra/operations/deposit.ts`.
- **Withdraw (encrypted → public).**
  `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction` —
  `src/services/umbra/operations/withdraw.ts`.
- **Create UTXO (4 variants).**
  `getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction`,
  `getEncryptedBalanceToSelfClaimableUtxoCreatorFunction`,
  `getPublicBalanceToReceiverClaimableUtxoCreatorFunction`,
  `getPublicBalanceToSelfClaimableUtxoCreatorFunction` — used in
  `src/services/umbra/operations/{transfer,sendEncrypted,claim}.ts`.
- **Claim.** `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction`
  + `getSelfClaimableUtxoToPublicBalanceClaimerFunction` —
  `src/services/umbra/operations/claim.ts`.
- **Scan pending UTXOs.** `getClaimableUtxoScannerFunction` —
  `src/services/umbra/queries/claims.ts`.
- **Relayer.** `getUmbraRelayer` exposed by `getRelayer()` —
  `src/services/umbra/client.ts:168-170`. Used for fee-free claims so
  recipients don't need SOL on their stealth wallet.

### ZK provers (`@umbra-privacy/rn-zk-prover`)

Mopro-bundled native xcframework distributed via npm (no Rust toolchain
required at build time). The provers are wired in
`src/features/stealth/zk/provers/`:

- `register.ts` — user registration prover
- `createUtxos.ts` — UTXO creators (covers create-utxo paths from both
  encrypted-balance and public-balance sources, with both
  receiver-unlocker and ephemeral-unlocker variants)
- `claimsUtxos.ts` — claim provers (receiver and ephemeral)
- `prover.ts` — shared prover lifecycle (memoization, asset loading)

zkey assets:

- `assets/zk/createdepositwithpublicamount.zkey` (~4.0 MB) — shipped
  in-bundle for the public-balance → encrypted-balance hot path.
- Other circuits' zkeys are lazy-fetched from a CDN at first use,
  managed by `src/features/stealth/zk/services/zkAssetService.ts`.

### User-facing surfaces

UI labels follow the contract pinned in
[`docs/glossary.md`](docs/glossary.md):

- **Shield** — Bank wallet public balance → Stealth wallet encrypted
  balance.
- **Unshield** — Stealth wallet encrypted balance → Bank wallet public
  balance.
- **Private send** — Stealth user A's encrypted balance → Stealth user
  B's encrypted balance.
- **Move** — direction-aware flows between Bank ↔ Stealth ↔ Encrypted
  balance.
- **Claim** — receiver/sender claims pending UTXOs into their encrypted
  or public balance.

Internal code keeps `stealfWallet`, `STEALF_*` SecureStore keys, and
`shielded` / `unshielded` verbs. The split is intentional and pinned in
`docs/glossary.md`.

### Mainnet deployment

- `NETWORK = 'mainnet'` (`src/services/umbra/client.ts:21`)
- `RELAYER_API = 'https://relayer.api.umbraprivacy.com'`
  (`src/services/umbra/client.ts:22`)
- `INDEXER_API = 'https://utxo-indexer.api.umbraprivacy.com'`
  (`src/services/umbra/client.ts:23`)

The Solana RPC and WebSocket endpoints come from `EXPO_PUBLIC_*` env
vars (see `src/services/env.ts:7-8`).

---

## 3. Build, test, use

### Prerequisites

- Xcode 15+ (iOS 16+ simulator or device)
- Node 20+
- CocoaPods (`sudo gem install cocoapods`)

### Clone + install

```bash
git clone <repo>
cd stealf-app
npm install
cp .env.example .env
```

Fill in `.env` per the table in [`README.md`](README.md#environment-variables).

### Native build

```bash
npx expo run:ios                          # debug
npx expo run:ios --configuration Release  # realistic perf check
```

`expo start` works for UI-only iteration; ZK and Solana paths require
the native build.

### Testing

`npm test` runs Vitest on **pure functions only** — Zod schemas,
helpers, reducers. Anything that touches React Native (SecureStore,
Turnkey native module, Umbra ZK provers) is exercised manually on a
physical iOS device. There is no Jest / Detox harness in this repo.

Manual test checklist for an Umbra-integration smoke run:

1. OAuth signup (Google or Apple) → bank wallet auto-provisioned →
   stealth wallet created during onboarding.
2. First Shield: Bank wallet public USDC balance → Stealth wallet
   encrypted balance. Verify the encrypted-balance pill updates and the
   Bank balance decreases by the shielded amount + fee.
3. Check encrypted balance: open the Stealth tab → encrypted balance
   matches the shielded amount.
4. First Private send: send a small USDC amount to a known Stealf user
   (set up two test devices). Verify the recipient sees a pending UTXO
   in `claims`.
5. Recipient claims the UTXO → balance shows up in their encrypted
   balance.

### User journey

The intended product flow:

1. **OAuth signup.** User taps Google or Apple → Turnkey provisions a
   sub-organization + Solana wallet. Stealf creates the local stealth
   wallet at the same time.
2. **Bank-wallet first use.** USDC is deposited into the bank wallet
   from any external Solana source (or from the Stealf card top-up
   once cash on-ramp is wired).
3. **Shield.** User chooses to move some balance into the encrypted
   balance for privacy.
4. **Private send / receive.** User-to-user encrypted USDC flows over
   Umbra UTXOs.
5. **Unshield + cash-out.** User unshields back to the public bank
   wallet → off-ramp to EUR via the Stealf card.

### Mainnet / devnet

The Umbra `network` constant is hardcoded to `'mainnet'` at
`src/services/umbra/client.ts:21`. To run a local devnet test, change
that constant to `'devnet'` and point `EXPO_PUBLIC_SOLANA_RPC_URL` /
`EXPO_PUBLIC_SOLANA_WSS_URL` at a devnet endpoint. The Umbra relayer
and indexer endpoints are mainnet-only.

---

