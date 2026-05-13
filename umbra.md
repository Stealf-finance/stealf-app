# Umbra integration in Stealf

---

## 1. Intro

### What are you building, and who is it for?

We're building Stealf, a privacy-first neobank on Solana with a dual-wallet architecture that gives users back what cash always offered by default: financial privacy.

Bank Wallet — managed via Turnkey (TEE), your bridge to the real world. Connected to banking infrastructure (virtual bank account, card payments, transfers), KYC-compliant by design.

Stealth Wallet — self-custodial, created locally, powered by the Umbra Privacy SDK. You hold the keys, control what you share, and invest privately.

Killer feature: move funds between your two wallets in two taps, privately. There's no direct on-chain link between them.

Stealf is for crypto-native users — traders, freelancers, founders whose financial life lives onchain. People who need a mobile-first interface to manage their money, keep full control, and stay private by default — without losing access to the real-world rails (cards, bank accounts, payments) they still rely on every day.

### Why did you decide to build this, and why build it now?

We started using crypto cards and loved the idea — but the experience is broken: you juggle two apps (banking + wallet), you don't really own your keys, and privacy means a third app on top. We wanted a single interface where you actually own your money, keep it private by default, and still spend it in the real world.

Why now:

Crypto cards are exploding — onchain spending is going mainstream, but the privacy gap widens with every transaction.

Arcium on Solana gives privacy-chain-level confidentiality without leaving a fast, scalable, DeFi-rich ecosystem. You no longer have to choose between privacy and utility — Zcash and Monero solved privacy but lack the protocol depth Solana has.

AI changes the threat model. Blockchain is public by default; your full financial history is trivially mineable at scale. Privacy stops being a preference and becomes a structural need.

The infrastructure is finally ready. The demand is finally there. The risk is finally tangible.

---

## 2. How Stealf uses the Umbra SDK

### Two wallets, two clients, two signers

Stealf provisions two distinct wallets per user:

- **Bank wallet** — Solana account custodied by Turnkey. The private key lives inside Turnkey's TEE; the client never sees it. All bank-wallet Solana transactions are signed remotely via Turnkey's signing API.
- **Stealth wallet** — local ED25519 keypair. Private key bytes stored in iOS Keychain via `expo-secure-store` and cached at runtime in `walletKeyCache` (15-minute TTL).

`UmbraClient` instances are built per wallet via Umbra's `getUmbraClient` factory. Stealf maintains two:

- `getStealthClient()` (`src/services/umbra/client.ts:94-103`, builder at `:36-86`) — primary client for the encrypted balance flows. Signer is the local ED25519 stealth key, wrapped via `createSignerFromPrivateKeyBytes` from `@umbra-privacy/sdk`.
- `getBankClient()` (`src/services/umbra/client.ts:127-161`) — used when an Umbra operation must be signed by the bank wallet (typical case: deposit from the bank's public USDC balance into a receiver-claimable UTXO destined for a stealth recipient). Signer is the Turnkey custodial signer.

The bank-wallet signer adapter is a custom bridge: `createTurnkeyUmbraSigner` (`src/services/umbra/turnkeySigner.ts:1-40`) implements Umbra's `IUmbraSigner` interface on top of Turnkey's `signTransaction` and `signMessage` APIs. The adapter serialises the SignableTransaction to wire format, sends the bytes to Turnkey for remote signing, and decodes the response back into a SignedTransaction.

### Primitives consumed from `@umbra-privacy/sdk`

- **Registration.** `getUserRegistrationFunction` paired with a custom prover from `@umbra-privacy/rn-zk-prover` (see `src/features/stealth/lib/registration.ts:1-49`). Both wallets get registered on Umbra's `EncryptedUserAccount` PDA on first use.
- **Deposit (public → encrypted).** `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` — `src/services/umbra/operations/deposit.ts`.
- **Withdraw (encrypted → public).** `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction` — `src/services/umbra/operations/withdraw.ts`.
- **Create UTXO (4 variants).** `getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction`, `getEncryptedBalanceToSelfClaimableUtxoCreatorFunction`, `getPublicBalanceToReceiverClaimableUtxoCreatorFunction`, `getPublicBalanceToSelfClaimableUtxoCreatorFunction` — defined in `src/services/umbra/operations/transfer.ts` and invoked inline from `useUmbra` (`src/features/stealth/hooks/useUmbra.ts`) and from the relevant flow screens (`MoveFlow`, `ShieldFlow`).
- **Claim.** `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` + `getSelfClaimableUtxoToPublicBalanceClaimerFunction` — `src/services/umbra/operations/claim.ts`.
- **Scan pending UTXOs.** `getClaimableUtxoScannerFunction` — wrapped by `fetchClaimScan` in `src/services/umbra/queries/claims.ts`. See "Claim scan strategy" below for the pagination + persistence layer that sits on top.
- **Relayer.** `getUmbraRelayer` exposed by `getRelayer()` — `src/services/umbra/client.ts:168-170`. Used for fee-free claims so recipients don't need SOL on their stealth wallet.

### Claim scan strategy

`getClaimableUtxoScannerFunction` has to walk the Merkle tree and
try-decrypt every ciphertext to find which UTXOs belong to the current
signer. On a tree with hundreds of thousands of leaves this is tens of
seconds of synchronous X25519 + AES-GCM crypto on the JS thread, even
when zero UTXOs match. Three layers sit on top of the SDK to keep the
app usable:

- **Paginated scan with JS-thread yields** — `fetchClaimScan` in
  `src/services/umbra/queries/claims.ts` calls the scanner in
  fixed-size chunks (`CHUNK_SIZE = 5_000` leaves, `MAX_LEAVES = 2^20`)
  and `await`s a `setTimeout(0)` between chunks. The total scan work
  is unchanged, but per-chunk freeze drops from tens of seconds to
  ~200ms, so taps / Reanimated worklets / React commits all interleave
  with the crawl.
- **Cursor + result persistence** — `src/features/stealth/lib/claimScanCache.ts`
  stores `{ treeIndex, cursor, results }` per stealf wallet in
  AsyncStorage. `fetchClaimScan` resumes from the saved cursor, so
  subsequent app launches only decrypt the delta since the last scan.
  The local burnt-blacklist (`isBurnt`) is reapplied on every merge
  so UTXOs claimed between sessions drop out of the cached set.
  Schema-versioned for forward compatibility.
- **Opt-in fetching** — `useClaimScan` in
  `src/features/stealth/hooks/useClaimScan.ts` accepts a
  `{ fetch?: boolean }` option and defaults to `false`. Badges and
  derived counts read from the cache only; screens that own the
  pending-claim truth (`ClaimPendingScreen`, `ClaimsScreen`) pass
  `{ fetch: true }` to force a fresh scan on mount. The cache is
  warmed once at login by `DataBootstrap`; cache invalidation after
  Move / Claim mutations triggers a delta refetch on next mount.

### ZK provers (`@umbra-privacy/rn-zk-prover`)

Mopro-bundled native xcframework distributed via npm (no Rust toolchain required at build time). The provers are wired in `src/features/stealth/zk/provers/`:

- `register.ts` — user registration prover
- `createUtxos.ts` — UTXO creators (covers create-utxo paths from both encrypted-balance and public-balance sources, with both receiver-unlocker and ephemeral-unlocker variants)
- `claimsUtxos.ts` — claim provers (receiver and ephemeral)
- `prover.ts` — shared prover lifecycle (memoization, asset loading)

zkey assets:

- `assets/zk/createdepositwithpublicamount.zkey` (~4.0 MB) — shipped in-bundle for the public-balance → encrypted-balance hot path.
- Other circuits' zkeys are lazy-fetched from a CDN at first use, managed by `src/features/stealth/zk/services/zkAssetService.ts`.

### User-facing surfaces

UI labels follow the contract pinned in [`docs/glossary.md`](docs/glossary.md):

- **Shield** — Bank wallet public balance → Stealth wallet encrypted balance.
- **Unshield** — Stealth wallet encrypted balance → Bank wallet public balance.
- **Private send** — Stealth user A's encrypted balance → Stealth user B's encrypted balance.
- **Move** — direction-aware flows between Bank ↔ Stealth ↔ Encrypted balance.
- **Claim** — receiver/sender claims pending UTXOs into their encrypted or public balance.

Internal code keeps `stealfWallet`, `STEALF_*` SecureStore keys, and `shielded` / `unshielded` verbs. The split is intentional and pinned in `docs/glossary.md`.

### Mainnet deployment

- `NETWORK = 'mainnet'` (`src/services/umbra/client.ts:21`)
- `RELAYER_API = 'https://relayer.api.umbraprivacy.com'` (`src/services/umbra/client.ts:22`)
- `INDEXER_API = 'https://utxo-indexer.api.umbraprivacy.com'` (`src/services/umbra/client.ts:23`)

The Solana RPC and WebSocket endpoints come from `EXPO_PUBLIC_*` env vars (see `src/services/env.ts:7-8`).

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

`expo start` works for UI-only iteration; ZK and Solana paths require the native build.

### Testing

`npm test` runs Vitest on **pure functions only**: Zod schemas, helpers, reducers. Anything that touches React Native (SecureStore, Turnkey native module, Umbra ZK provers) is exercised manually on a physical iOS device. There is no Jest / Detox harness in this repo.

Manual test checklist for an Umbra-integration smoke run:

1. OAuth signup (Google or Apple) → bank wallet auto-provisioned → stealth wallet created during onboarding.
2. First Shield: Bank wallet public USDC balance → Stealth wallet encrypted balance. Verify the encrypted-balance pill updates and the Bank balance decreases by the shielded amount + fee.
3. Check encrypted balance: open the Stealth tab and verify the encrypted balance matches the shielded amount.
4. First Private send: send a small USDC amount to a known Stealf user (set up two test devices). Verify the recipient sees a pending UTXO in `claims`.
5. Recipient claims the UTXO. Balance shows up in their encrypted balance.

### User journey

The intended product flow:

1. **OAuth signup.** User taps Google or Apple → Turnkey provisions a sub-organization and a Solana wallet. Stealf creates the local stealth wallet at the same time.
2. **Bank-wallet first use.** USDC is deposited into the bank wallet from any external Solana source, or from the Stealf card top-up once cash on-ramp is wired.
3. **Shield.** User chooses to move some balance into the encrypted balance for privacy.
4. **Private send / receive.** User-to-user encrypted USDC flows over Umbra UTXOs.
5. **Unshield + cash-out.** User unshields back to the public bank wallet → off-ramp to fiat via the Stealf card.

### Mainnet / devnet

The Umbra `network` constant is hardcoded to `'mainnet'` at `src/services/umbra/client.ts:21`. To run a local devnet test, change that constant to `'devnet'` and point `EXPO_PUBLIC_SOLANA_RPC_URL` / `EXPO_PUBLIC_SOLANA_WSS_URL` at a devnet endpoint. The Umbra relayer and indexer endpoints are mainnet-only.