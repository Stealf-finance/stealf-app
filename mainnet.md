# Stealf — Mainnet Implementation Record (READ THIS FIRST)

> **Purpose.** This file is the single source of truth for the Solana **mainnet**
> launch of the Stealf rebuild. If you are an AI agent (or human) picking up this
> work, read this top-to-bottom before touching anything. It records what was
> done, why, what is live, what is parked, and the exact remaining path to real
> users.
>
> Last updated: 2026-07-23.

---

## 0. TL;DR — current state

- **Backend mainnet = DONE and LIVE.** A dedicated Railway environment
  (`mainnet`) serves `https://backend-stealf-mainnet.up.railway.app`, healthy,
  on a mainnet Helius RPC, with an isolated Mongo DB (`stealf-mainnet`, 0 real
  users yet). All audit-blocker fixes and the JitoSOL feature are deployed.
- **App mainnet = CODE READY, not yet shipped.** Branch **`mainnet`** (in
  `stealf-app`) carries the full mainnet flip + audit fixes + JitoSOL UI. Tests
  green (app 188, backend 226), device-readiness verdict = GO.
- **The ONE gate to real users = a native iOS build.** EAS `eas build --profile
  mainnet` is quota-blocked until **2026-08-01** (or upgrade EAS). A **local**
  build (`expo run:ios`) works today for on-device testing (see §8).
- **Strategy = parallel.** The rebuild runs on mainnet *alongside* the legacy
  `front-stealf` app (which stays on **devnet** with ~150 users). We did NOT
  touch the shared devnet backend `api.stealf.xyz`.

---

## 1. Repos, branches, environments

| Thing | Value |
|---|---|
| App repo | `stealf-app` (React Native / Expo). Mainnet branch: **`mainnet`** (= `feat/mainnet` + everything below). Default branch: `main`. |
| Backend repo | `backend-stealf` (Express/TS). Mainnet branch: **`mainnet`** (snapshot of `main`). Prod deploys from **`main`**. |
| Backend is **cluster-agnostic** | The same code serves devnet or mainnet; the network is chosen purely by **env vars** (mainly `SOLANA_RPC_URL`). So there is no "mainnet code" on the backend — mainnet is a Railway *environment*, not a branch. The `mainnet` branch is just a marker/snapshot. |
| Railway backend project | `backend-stealf` (project id `6f4c145e-d42e-4fcf-a6a9-935aafa10629`). Two environments: `production` (devnet, serves front-stealf) and **`mainnet`** (this launch). Both build from `main`. |
| Mainnet backend domain | `https://backend-stealf-mainnet.up.railway.app` (Railway auto-domain; no custom domain needed). |

> ⚠️ Railway does **not** auto-deploy on push to `main` for this project — you
> must trigger **Deploy/Redeploy** on the `mainnet` env after merging to `main`.

---

## 2. Backend mainnet environment (Railway `mainnet` env)

Created by **duplicating** the `production` env (copies all services + vars, so
the Zod env validation in `src/config/env.ts` never crashes on boot — it
`process.exit(1)`s if any required var is missing). Its own Redis + Mongo
services. Then the network-specific vars were overridden:

| Var | Mainnet value | Notes |
|---|---|---|
| `SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=e7b3a134-e88b-4a7d-a771-05df242ff787` | **THE cluster switch.** Backend keys everything off `SOLANA_RPC_URL.includes('devnet')`. |
| `HELIUS_WEBHOOK_ID` | `802be2a6-5159-4875-b292-9d01b92ecee8` | New **mainnet** wallet webhook (type `raw`), created via Helius API, posts to `…/api/helius/helius`, authHeader = the shared `HELIUS_WEBHOOK_SECRET`. |
| `HELIUS_VAULT_WEBHOOK_ID` | left as the devnet value `feb46c74-…` | Vault webhook is only for the parked private-yield path; backend verifies only the WALLET webhook at boot, so this is inert. Helius plan cap = **5 webhooks max** (currently at limit; delete the dead ngrok webhook `e06df689` to free a slot if you need the vault one). |
| `BACKEND_URL`, `WEBHOOK_URL` | `https://backend-stealf-mainnet.up.railway.app` | |
| `MONGODB_URI` | same Atlas cluster, DB name `stealf-pro` → **`stealf-mainnet`** | Isolates mainnet balances/positions/dedup from devnet. It's a hardcoded Atlas URI, NOT the Railway Mongo service. Fresh/empty DB → every user (re-)onboards on first mainnet login (same Turnkey wallet address). |
| `REFLECT_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=e7b3a134-…` | STLF (USDC+) mint/burn broadcast RPC. Without it the controller defaults to the rate-limited public `api.mainnet-beta.solana.com`. |
| `NODE_ENV` | `production` | gates rate-limiting + CORS. |
| Already mainnet / kept | `XSTOCKS_RPC_URL`, `REFLECT_*`, `STLF_MINT` (`6M2AtRdX…`), `USDC_PLUS_MINT` (`A1KLoBrK…`), `HELIUS_API_KEY`, Turnkey org/proxy | STLF + xStocks were already mainnet-brokered. |

**Shared / cluster-independent (same for devnet & mainnet):** Turnkey org
`287a3940-612f-4472-b94f-faf8971748ee`, auth proxy
`276b73eb-f1e6-41ef-ab2b-5c0f783a194a`.

Webhook mechanism: `src/services/helius/webhookManager.ts` verifies the wallet
webhook at boot and **adds each new user's bank wallet** to it (GET+PUT) at
`createUser`. It never creates webhooks — those are created out-of-band via the
Helius API.

---

## 3. App mainnet config (already on the `mainnet` branch)

The **mainnet flip itself** predates the 2026-07 audit session (commits
`5eb914d`, `e319dc4`). It consists of:

- `src/services/umbra/client.ts`: `NETWORK = 'mainnet'`, relayer
  `https://relayer.api.umbraprivacy.com`, indexer
  `https://utxo-indexer.api.umbraprivacy.com` (mainnet = drop the `-devnet`
  suffix; both return HTTP 200). ZK assets host `zk.api.umbraprivacy.com` is
  network-agnostic.
- `src/services/solana/kit.ts`: `devnet(...)` → `mainnet(...)` cluster wrapper on
  both the RPC and RPC-subscriptions builders. **Because of this, the bundled
  `EXPO_PUBLIC_SOLANA_RPC_URL` MUST be a mainnet endpoint** or the mainnet()
  wrapper wraps a devnet URL → broken.
- `src/constants/solana.ts`: mainnet mints — USDC
  `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, USDT
  `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`.
- `src/services/umbra/storage/mmkvStorageBackend.ts`:
  `STORE_MIGRATION_VERSION = 'mmkv-mainnet-v1'` — **mandatory**; it forces a
  one-time wipe of the devnet UTXO/nullifier MMKV store so a devnet scan doesn't
  corrupt the mainnet scan. (The wipe keys on this version string, NOT on
  `NETWORK`.)
- `eas.json`: a `mainnet` build profile (channel `mainnet`, mainnet Helius
  RPC/WSS, Turnkey org/proxy, `EXPO_PUBLIC_API_URL` =
  `https://backend-stealf-mainnet.up.railway.app`,
  `EXPO_PUBLIC_PORTOLA_HOST_URL` = `…/portola`). PostHog key is still a
  placeholder (`phc_localdev_placeholder`) → telemetry off; set a real key for
  prod.
- `.env.local` (gitignored) — for **local** device builds: set to the mainnet
  backend + mainnet RPC (see §8). A backup of the dev/LAN config is at
  `.env.local.devnet.bak`.

> **Cluster gotcha (critical):** the app derives its Solana cluster ENTIRELY
> from the build-time `EXPO_PUBLIC_SOLANA_RPC_URL`. `eas build --profile
> mainnet` uses the eas.json mainnet env. A **local** `expo run:ios` uses
> `.env.local`. An `eas update` (OTA) inlines whatever `EXPO_PUBLIC_*` are in the
> shell/.env at publish time — so **only ship mainnet via `eas build`, never OTA
> the mainnet channel** unless the env is pinned, or you can silently repoint a
> mainnet build to devnet.

---

## 4. Mainnet-readiness audit (2 rounds + device-readiness pass)

Ran a multi-agent audit (24 audit agents + ~50 adversarial verifiers) on the
`mainnet` branch. Codex was rate-limited (until ~2026-08-08) so it didn't
contribute. Automated baseline: backend **226/226** jest, app **188/188** vitest,
both `tsc --noEmit` clean. The app **bundles** cleanly (`expo export`, 21.9 MB
Hermes bundle). Device-readiness verdict = **GO** (no crashes, no startup
throws, no regressions from the fixes).

### 4a. FIXED this session (all tested green, deployed where noted)

**Backend** (merged to `main` via PR #42 = `59c7834`, deployed):
- `authController.ts` + `createUser.ts` — **BLOCKER**: Sign in with Apple drops
  the `email` claim after first authorization, so returning Apple users hit the
  empty mainnet DB with no email and were hard-400'd into a permanent lockout.
  Added `createOidcUserWithoutEmail`: when a JWKS-verified OIDC identity exists
  but no email, create the account from a stable `sub`-derived synthetic
  identity (unique emailHash + pseudo). Also: re-link branches now sync
  `bank_wallet` (a new sub-org means a new Turnkey wallet).
- `validations.ts` — **BLOCKER**: `bank_wallet.length(44)` rejected ~5.5% of
  valid base58 Solana addresses (32–44 chars). Dropped the exact-44 check (the
  `{32,44}` regex already bounds length).
- `xstocksTradeService.ts` — **HIGH**: Jupiter Ultra `/execute` returns HTTP 200
  with body-level `status:"Failed"` for on-chain failures; we forwarded it as
  success ("Order sent" phantom). Now throws on non-Success.

**App** (branch `mainnet`):
- `src/features/stealth/lib/burntUtxos.ts` — **HIGH**: the burnt-UTXO blacklist
  lived in SecureStore keyed only by wallet key, surviving the devnet→mainnet
  MMKV wipe. Burnt IDs are positional (`tree:leaf`) merkle coords that reset per
  Umbra deployment, so a devnet blacklist hid real mainnet notes. Now
  **network-scoped** (`…${NETWORK}_${key}`) → mainnet starts empty.
- `src/features/send/hooks/useSendSimple.ts` — bank send read `wallets[0]` with
  no `refreshWallets` fallback → cold-start "Wallet account not found". Added the
  fallback (mirrors the sibling signing hooks). Also floored the "Use Max"
  amount in `useAmountInput.ts` (was rounding up over the balance and blocking
  the send).
- `useLogout.ts` / `useDeleteAccount.ts` / `queryClient.ts` /
  `mmkvStorageBackend.ts` — logout/delete leaked the **persisted** React Query
  cache (balance/history/profile incl. email) on disk; delete never wiped the
  Umbra MMKV store. Added `purgePersistedQueryCache()` (both) +
  `clearAllUmbraMmkvStore()` (delete only).
- `package.json` — pinned `expo-notifications` to the SDK-54 line (`~0.32.17`);
  it was an SDK-55 native module floated by a caret, which endangered a fresh
  iOS build. `OfflineBanner.tsx` — lint fix.
- `eas.json` — pointed `EXPO_PUBLIC_API_URL` at the live mainnet backend.

### 4b. OPEN — deliberately NOT auto-fixed (need a decision or on-device testing)

- **Biometric gating on key/mnemonic export** (`src/services/auth/secureStore.ts`)
  — `requireAuthentication` is OFF for the high-sensitivity keys, contrary to
  CLAUDE.md rule #4. Fixing it needs a keychain migration + a Face-ID UX call
  (it affects signing + the session token, read at startup). **Needs sign-off.**
- **"Success shown on an unconfirmed tx"** — systemic across bank send, STLF
  mint/burn, stealth public send, shield/unshield, and move: the UI declares
  success on broadcast/build without polling `getSignatureStatuses`. xStocks is
  already fixed (backend throws on non-Success). Do the rest as ONE shared
  confirmation-helper change WITH a device to test money-flow semantics.
- **JWT session refresh/expiry** (`AuthContext.tsx`) — stored session JWT is
  never `exp`-checked or refreshed; a returning user past the TTL is stuck in a
  broken authenticated shell (401s everywhere, no auto-logout). Needs a 401
  interceptor + wire `onSessionExpired`.
- **SOL/rent prechecks** (mainnet real fees) — SPL send, first xStock buy
  (Token-2022 ATA rent), bank→shielded move don't pre-check the wallet has SOL
  for fees/rent.
- **Token-2022 send from bank** — `buildTransfer.ts` hardcodes the legacy Token
  program; Token-2022 assets (PYUSD, some xStocks) are un-sendable via simple
  send. `.sol` recipient names are accepted but never resolved.
- **Backend history filter** (`parseTransactions.ts`) — drops every SPL transfer
  that isn't SOL/USDC/USDT from `/wallet/history` + the socket feed (STLF,
  xStocks, USDC+ receives are invisible in history though the balance updates).
- Move-flow lows: failed move shows a success screen; Solscan link never renders
  (wrong result field); no in-flight guard; 1-base-unit under-send.
- **Webhook registration** is non-atomic (read-modify-write race) + swallows
  errors + only runs at signup → some users can silently miss deposit detection.

Full per-finding detail lives in the audit memory + the workflow outputs
(`tasks/w3xlir3ne.output`, `tasks/w6si3exmx.output` in the session dir).

---

## 5. JitoSOL yield — Option B (liquid staking) — IMPLEMENTED

**Key insight:** basic JitoSOL staking needs **NO custom on-chain program**.
JitoSOL is a normal SPL token minted by the **public** Jito stake pool
(`Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb`, owned by the SPL Stake Pool
program `SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy`; mint
`J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn`). Deposits are permissionless.

**Option B (implemented):** the user's own bank wallet swaps native SOL ↔ JitoSOL
via **Jupiter Ultra** — the exact same broker pattern as xStocks (build →
Turnkey sign → execute). JitoSOL is held directly in the bank wallet and
appreciates vs SOL over time (that is the yield). Non-private (the holding is
visible on the bank wallet, like USDC).

- Backend (merged to `main` via PR #43 = `155b54d`, deployed — routes return 401
  = live): `src/services/yield/jitoStakeService.ts` (buildStake/buildUnstake/
  execute, throws on Jupiter `status:"Failed"`), `JitoStakeController.ts`
  (resolveSigner authz — explicit signer must equal caller's bank wallet or
  403), routes `POST /api/yield/jito/{build-stake,build-unstake,execute}` (auth).
  14 unit tests.
- App (branch `mainnet`): `src/features/grow/api/jitoStake.ts`,
  `hooks/useJitoStake.ts`, `screens/JitoStakeScreen.tsx` (stake amount + MAX,
  unstake-all, Solscan link), a "Staking" card in `GrowHub.tsx`, route
  `app/jito.tsx`. 9 unit tests.

**Option A (PRIVATE JitoSOL) — STILL PARKED.** This is the one that needs the
custom programs. `stealf_vault` (`4ZxuCrdioJHhqp9sSF5vo9npUdDGRVVMMcq59BnMWqJA`,
plain Anchor pooled-custody vault) and `private_yield`
(`F3ypFyPnffVd4sq3wDRZjHLz3F9GBnYoKw3gSHjN2Uts`, **Arcium MPC** per-user encrypted
balances) are **deployed on devnet, NOT on mainnet**. To ship the private
version you need: ~5–10 SOL to deploy each program, the Anchor source + upgrade
keypairs (NOT on this machine — only the IDL JSON in
`backend-stealf/src/program/`), a mainnet Arcium MXE cluster (Arcium IS on
mainnet per Thomas), and to re-wire the client deposit flow. The backend still
has the vault-based staking path in `src/services/yield/staking.ts`.

---

## 6. Parked / deferred (NOT in the launch subset)

- **JitoSOL PRIVATE / MPC yield** (Option A above) — needs program deploys +
  Arcium + SOL.
- **Borrow (Portola)** — deferred; `PORTOLA_API_KEY` is a `pk_test_` sandbox key.
  The borrow tile exists in the UI.
- **Card** — stub, unreferenced.
- **App-lock** (`app/lock.tsx`) — stub by design.

Launch subset = onboarding, bank (SOL/USDC send/receive), stealth (Umbra),
move, STLF (USDC+), xStocks, and now JitoSOL liquid staking.

---

## 7. Remaining path to real users

1. **Native iOS build** — the only hard gate. `eas build --platform ios
   --profile mainnet` is blocked by the free EAS quota until **2026-08-01** (or
   upgrade EAS to build now). For testing today, do a **local** build (§8).
2. **On-device smoke test** with small real funds (§8).
3. **Ship** — TestFlight / App Store submission (build + Apple review).
4. **Optional hardening (Lot C)** — biometric export + the shared
   confirmation-on-tx helper. Not blockers.
5. Before scale: real PostHog key, consider a dedicated mainnet Helius key + EAS
   secret, and set up the mainnet Helius **vault** webhook if enabling private
   yield.

---

## 8. How to build & test on device (local mainnet build)

```bash
cd stealf-app
git checkout mainnet          # the mainnet branch
# .env.local should already point at mainnet:
#   EXPO_PUBLIC_API_URL=https://backend-stealf-mainnet.up.railway.app
#   EXPO_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=e7b3a134-…
#   EXPO_PUBLIC_SOLANA_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=e7b3a134-…
#   (Turnkey org/proxy are cluster-independent; DEV_BYPASS_AUTH=false)
# to revert to dev/LAN:  cp .env.local.devnet.bak .env.local
npx expo run:ios --configuration Release --device
```

Smoke-test order (small real funds), each verified on Solscan:
1. Login (Turnkey; existing accounts resolve; Apple sign-in is fixed).
2. Bank: receive USDC → balance → send.
3. STLF: buy $1 → balance → sell.
4. xStocks: buy $1 → holding → sell.
5. JitoSOL: Grow → **Staking** card → stake a little SOL → unstake all.
6. Stealth **last** (riskiest — Umbra mainnet + real funds): shield → private
   send → claim/unshield.

Watch-items (expected, not bugs): optimistic "success" may show before on-chain
finality (verify on Solscan); first cold-start / first stealth op can pause while
the ~49.5 MB `userregistration.zkey` loads.

---

## 9. Facts the next agent MUST NOT get wrong

- **Do NOT flip `api.stealf.xyz` (Railway `production` env) to mainnet** — it
  serves front-stealf's ~150 devnet users. Mainnet is the separate `mainnet` env.
- **Backend network = env vars, not code.** Change `SOLANA_RPC_URL` etc. on the
  Railway `mainnet` env; the code is cluster-agnostic. Redeploy manually after
  merging to `main`.
- **App cluster = build-time `EXPO_PUBLIC_SOLANA_RPC_URL`.** `mainnet()` in
  kit.ts requires a mainnet RPC value. Never OTA the mainnet channel with devnet
  env in scope.
- **`STORE_MIGRATION_VERSION` must stay bumped** (`mmkv-mainnet-v1`) or the
  devnet UTXO store corrupts the mainnet stealth scan.
- **Turnkey org/proxy are shared** across clusters — login works on either; a
  user keeps the same wallet address on mainnet but gets a fresh record in the
  empty `stealf-mainnet` DB.
- **Helius plan cap = 5 webhooks.** Currently at the limit.
- **Codex** was usage-limited until ~2026-08-08; **EAS iOS** quota resets
  2026-08-01.
- Internal code names (`stealfWallet`, `STEALF_*`, `shielded`/`unshielded`) vs
  UI copy are intentional (CLAUDE.md); signing split (bank=Turnkey /
  stealth=local ED25519) is intentional; `EXPO_PUBLIC_*` are config, not secrets.

---

## 10. Commit / branch reference

**backend-stealf** (branch `mainnet` = snapshot of `main`):
- `59c7834` (PR #42) — audit blocker fixes (Apple onboarding, bank_wallet,
  xStocks status, re-link).
- `155b54d` (PR #43) — JitoSOL Option B (service + controller + routes + 14 tests).

**stealf-app** (branch `mainnet`):
- `5eb914d`, `e319dc4` — the original mainnet flip (Umbra/cluster/mints/store) +
  filled eas.json (pre-audit).
- `7c57a12` — eas.json → live mainnet backend domain.
- `7896a87` — burnt-UTXO network-scope + cold-start send hydration.
- `c04e839` — purge persisted cache on logout/delete + Use-Max floor.
- `c444147` — pin expo-notifications (SDK-54).
- `133fba8` — JitoSOL client (api + hook, 9 tests).
- `26fc488` — JitoSOL UI (Grow card + stake/unstake screen).

Related docs: `MAINNET_MIGRATION.md` (the earlier runbook, same repo root).
