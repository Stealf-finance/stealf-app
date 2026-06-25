# Portola integration — Stealf

Embedded **uncollateralized borrower lending** for Stealf users via Portola.
Portola runs the entire borrower experience (application, KYC, income
verification, offer, document signing, funding, repayment) inside an embed and
routes to lenders behind the scenes. **Our only job is signing** — Portola does
the rest.

> Status: drafted from Portola's "Get started" docs (Overview, Quickstart,
> Embedding, Authentication). **Sessions reference, full postMessage contract,
> gasless repayment, and webhooks are not yet covered** — sections marked
> `⏳ PENDING DOCS` complete once we have the rest.

---

## ⚠️ Two hard adaptations before any code

Portola's docs assume an **EVM web dApp**. Stealf is a **Solana React Native
app**. Neither assumption holds out of the box. These two items are the real
integration, not the signing handler.

### A. Chain: Portola is EVM, Stealf is Solana

| Portola expects | Stealf has today |
|---|---|
| `address` = Ethereum `0x…` | Solana base58 (bank + stealth wallets) |
| `chainId` = `eip155:84532` (Base Sepolia sandbox) / Base mainnet | Solana mainnet/devnet |
| EIP-1193 provider, `personal_sign`, `eth_signTypedData_v4` | `@solana/kit` + Turnkey Solana signing |

**The borrower wallet must be an EVM account.** Good news: Turnkey can hold an
**Ethereum (secp256k1) account in the same sub-org** as the user's Solana bank
wallet — so we provision/derive an EVM address per user and use it as the
borrower wallet. Turnkey already does the remote signing; we add EVM signing
methods alongside the existing Solana ones.

**Decision needed (Thomas):** is the Portola borrower wallet a **new
Turnkey-derived EVM account** per user (recommended), or do we skip Portola on
the bank wallet entirely? No Solana-only path exists — Portola is EVM.

#### ✅ Verified against the installed `@turnkey/*` SDK
Deriving the EVM address is a one-time, **silent** activity on the user's
*existing* HD wallet — same seed, same sub-org, signed by the active session
(no Face ID prompt, no new backup). **The user connects nothing** — there is no
MetaMask/WalletConnect/import step; Stealf provisions and controls the address
itself (same custody model as the bank wallet).

```ts
const { httpClient, wallets } = useTurnkey();
const { addresses } = await httpClient.createWalletAccounts({
  walletId: wallets[0].walletId,                 // the user's existing HD wallet
  accounts: [{
    curve: 'CURVE_SECP256K1',
    pathFormat: 'PATH_FORMAT_BIP32',
    path: "m/44'/60'/0'/0/0",                    // standard Ethereum path
    addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
  }],
});
const evmAddress = addresses[0];                 // 0x… → persist on the backend user
```
- **Idempotent** on `(walletId, path)` — safe to call at login or first Portola open.
- **Signing** (Part 3) uses `httpClient.signRawPayload` (secp256k1 + keccak256),
  both confirmed present in the installed SDK. The EIP-191/EIP-712 digest is
  computed client-side (`viem`/`ethers`) before signing.
- **Check:** Turnkey policies must permit signing with the Ethereum account
  (test in sandbox).

### B. Embed host: iframe (web) → `react-native-webview`

Portola ships a browser `<iframe>` + `window.postMessage` controller. In Expo
there is no iframe; we use **`react-native-webview`** and bridge messages with
`onMessage` / `injectedJavaScript`.

There's a subtlety with `parentOrigin` (see [Origin allowlist](#origin-allowlist)):
the embed posts back to an **allowlisted https origin**, which a native WebView
doesn't naturally have. The clean path is **Approach A** below; **Approach B**
needs confirmation from Portola.

- **Approach A — host a thin page (recommended, matches the docs).** Serve a
  minimal HTML page on a real Stealf origin (e.g. `https://embed.stealf.xyz/portola`)
  that mounts the Portola `<iframe>` and runs the `createEmbedController`. Load
  *that page* in the WebView. `parentOrigin` = `https://embed.stealf.xyz`
  (allowlisted). The controller bridges each `sign` request to native via
  `window.ReactNativeWebView.postMessage`, and RN replies with
  `injectJavaScript`. This keeps Portola's documented contract intact.
- **Approach B — load `embedUrl` directly in the WebView.** Simpler, but the
  embed expects a parent frame to post to; whether it posts to the top window
  when loaded standalone is **undocumented**. Confirm with Portola before
  relying on it.

**Decision needed:** Approach A (host page) vs B (confirm standalone). This doc
assumes **A**.

---

## Architecture for Stealf

```
┌─────────────────────────── stealf-app (Expo / RN) ───────────────────────────┐
│                                                                               │
│  Borrow screen ──► <WebView src="https://embed.stealf.xyz/portola?session=…">│
│        ▲                         │ (host page mounts Portola <iframe>)        │
│        │ injectJavaScript        │ window.ReactNativeWebView.postMessage      │
│        │ (signatures back)       ▼                                            │
│   Turnkey EVM signer  ◄──── onMessage: { kind: "sign", items: […] }          │
│   (personal_sign /                                                            │
│    eth_signTypedData_v4)                                                      │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                     │ 1. POST /api/portola/session (server-side)
                                     ▼
┌──────────────────────── backend-stealf (Express) ───────────────────────────┐
│  POST /api/portola/session  ── X-API-Key: PORTOLA_API_KEY (secret) ──────────┼──► embed.tryportola.com/api/session
│  → returns { embedUrl, sessionId, expiresAt }                                │     (returns one-time embedUrl)
│  (optional) POST /api/portola/webhook  ⏳ PENDING DOCS                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Three parts** (Portola's model, mapped to Stealf):

1. **Mint a session** — backend-stealf, with the secret API key → `embedUrl`.
2. **Mount the embed** — RN WebView pointed at the host page (which carries `embedUrl`).
3. **Answer `sign` requests** — bridge WebView → Turnkey EVM signer → reply.

The embed handles minting the loan, repayments, and refreshing its own state.

### What we do NOT handle
- **Borrower identity / KYC** — embed-internal, persists across sessions. Returning users skip re-verification.
- **Lenders** — routing + underwriting are Portola's. Sandbox auto-lender approves & funds.
- **Gas** — repayments are gasless; Portola's relayer broadcasts and pays. (`⏳ details in repayment docs`)

---

## Part 1 — Mint a session (backend-stealf)

New route. The secret `PORTOLA_API_KEY` (`pk_test_…` / `pk_live_…`) lives **only**
on the backend, never in the app bundle. Follow existing backend conventions
(class controller, Zod validation, Pino logging).

### Env
```
# backend-stealf/.env
PORTOLA_API_KEY=pk_test_xxx            # secret, server-side only
PORTOLA_EMBED_URL=https://embed.tryportola.com
PORTOLA_PARENT_ORIGIN=https://embed.stealf.xyz   # allowlisted in Portola portal
PORTOLA_CHAIN_ID=eip155:84532          # Base Sepolia (sandbox); Base mainnet in prod
PORTOLA_WEBHOOK_SECRET=whsec_xxx       # optional, for webhook HMAC verification
```

### Route
```ts
// src/routes/portolaRoutes.ts
router.post('/session', verifyAuth, PortolaController.createSession);
// router.post('/webhook', PortolaController.webhook);   // ⏳ PENDING DOCS
```

### Controller (sketch — refine with the Sessions reference)
```ts
// src/controllers/PortolaController.ts
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';

const BodySchema = z.object({
  // EVM borrower address (Turnkey-derived ETH account for this user)
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export class PortolaController {
  static async createSession(req, res, next) {
    try {
      const { address } = BodySchema.parse(req.body);

      const r = await fetch(`${env.PORTOLA_EMBED_URL}/api/session`, {
        method: 'POST',
        headers: {
          'X-API-Key': env.PORTOLA_API_KEY,         // secret stays here
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          chainId: env.PORTOLA_CHAIN_ID,
          parentOrigin: env.PORTOLA_PARENT_ORIGIN,
        }),
      });

      if (!r.ok) {
        logger.error({ status: r.status }, 'portola session mint failed');
        return res.status(502).json({ error: 'Portola session mint failed' });
      }
      // { sessionId, embedUrl, expiresAt }
      const data = await r.json();
      return res.json({ data });   // app only ever gets embedUrl, never the key
    } catch (err) {
      next(err);
    }
  }
}
```

### Request fields
| Field | Required | Notes |
|---|---|---|
| `address` | yes | Borrower wallet. The embed requests signatures from **exactly** this address. |
| `chainId` | yes | Accepts CAIP-2 (`eip155:84532`), hex (`0x14a34`), or decimal (`84532`). Sandbox = Base Sepolia. |
| `parentOrigin` | optional | The single origin this session is mounted from + the only origin the embed posts to. Defaults to your first configured origin. If provided, **must** match an allowlisted origin — pins one, never widens the allowlist. |

### Response (`201`)
| Field | Notes |
|---|---|
| `sessionId` | Opaque (`emb_…`). |
| `embedUrl` | Mount in the WebView/iframe; carries the session. |
| `expiresAt` | ISO 8601. **24h lifetime.** |

### Errors (`{ error, message }`)
| Status | `error` | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | Missing/invalid `X-API-Key`. |
| `400` | `BAD_REQUEST` | Missing `address` or `chainId`. |
| `403` | `FORBIDDEN` | No origin configured for the account. |
| `403` | `FORBIDDEN` | `parentOrigin` not in the allowlist. |

**Notes**
- The app never sees `PORTOLA_API_KEY` — it only receives `embedUrl` / `sessionId`.
- Mint a **fresh session per open** (24h). On expiry the embed posts `portola:session_expired` → re-mint + reset `src`.
- `parentOrigin` matters once we register >1 origin (prod + staging): pass the one this mount uses.

---

## Part 2 — Mount the embed (stealf-app, RN WebView)

A `react-native-webview` pointed at the **host page** carrying the `embedUrl`.

> `react-native-webview` is **not currently installed** — `npm i react-native-webview`
> and rebuild (native module). Camera permission must be declared in `app.config.js`
> (`NSCameraUsageDescription` / Android `CAMERA`) — KYC captures a document + selfie.

```tsx
// src/features/borrow/screens/BorrowFlow.tsx (new feature)
import { WebView } from 'react-native-webview';

// host page that embeds Portola's iframe + runs the controller, on our origin
const HOST = 'https://embed.stealf.xyz/portola';

export function BorrowFlow({ embedUrl, onComplete, onSign, onSessionExpired }) {
  const ref = useRef<WebView>(null);
  const src = `${HOST}?embed=${encodeURIComponent(embedUrl)}`;

  return (
    <WebView
      ref={ref}
      source={{ uri: src }}
      // camera required for identity verification
      mediaCapturePermissionGrantType="grant"
      allowsInlineMediaPlayback
      onMessage={(e) => {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.kind === 'sign') {
          onSign(msg).then((signatures) =>
            ref.current?.injectJavaScript(
              `window.__portolaReply(${JSON.stringify({ id: msg.id, signatures })});true;`,
            ),
          );
        } else if (msg.type === 'portola:complete') onComplete(msg);   // FUNDED | DECLINED | WITHDRAWN | EXPIRED
        else if (msg.type === 'portola:session_expired') onSessionExpired();
      }}
      style={{ flex: 1 }}
    />
  );
}
```

- **Size it like a screen, not a card** — full-height (bottom sheet / full route),
  let it scroll internally. The flow is a ~390px mobile column.
- **One session per mount** — mint a fresh session each time the borrower opens
  the flow (sessions last 24h; see below).
- **Branding** (primary/background color + logo) is set in the Portola portal,
  applied automatically — nothing passed at mount.

The host page (`https://embed.stealf.xyz/portola`) runs Portola's
`createEmbedController` from the Quickstart, but instead of signing in-page it
**forwards** each `sign` to native (`window.ReactNativeWebView.postMessage`) and
exposes `window.__portolaReply(...)` for RN to inject the signatures. (Full
controller in [Appendix](#appendix-host-page-controller).)

### Lifecycle signals
| Message | Payload | Action |
|---|---|---|
| `portola:complete` | `{ applicationId, status }` | Terminal: `FUNDED` / `DECLINED` / `WITHDRAWN` / `EXPIRED` → dismiss/transition |
| `portola:session_expired` | none | Mint a fresh session, reset WebView `src` |

Intermediate status changes (verification, signing, funding) are **not** posted
here — use webhooks if the backend needs them (`⏳ PENDING DOCS`).

---

## Part 3 — Answer `sign` requests (Turnkey EVM signing)

The embed posts **one** request kind, `sign`. There are also two fire-and-forget
notifications (`portola:complete`, `portola:session_expired`).

### The contract
```ts
type SignRequest = {
  portola: 1;
  kind: 'sign';
  id: string;          // echo this in the reply
  items: SignItem[];   // sign each, IN ORDER
};
type SignItem =
  | { method: 'personal_sign';        address: string; message: string }
  | { method: 'eth_signTypedData_v4'; address: string; typedData: unknown };

type SignResult =
  | { portola: 1; kind: 'signed';   id: string; signatures: string[] }  // one per item, same order
  | { portola: 1; kind: 'rejected'; id: string; message: string };      // decline / failure
```

### Rules (non-negotiable)
- **Envelope `portola: 1`.** Validate origin on both sides — when receiving, check
  `event.origin === embedOrigin` **and** `event.source === iframe.contentWindow`;
  when replying, target the embed origin, **never `"*"`**. The embed itself
  rejects any reply whose origin isn't the pinned `parentOrigin`, and matches
  replies to requests by `id`.
- **Sign with the session wallet** — `item.address` equals the minted `address`.
- **Return signatures in `items` order.** A request may batch several.
- **Echo `id`. 120s timeout** — the embed fails the request after 2 min.
- **On decline/error reply `rejected`** — never leave it hanging.
- **Pass `typedData` unchanged** to `eth_signTypedData_v4`. The host page is **not**
  a policy engine — route each item to the wallet as-is. Portola validates loan,
  amount, asset, target, chain, borrower, schedule before it ever asks.

### When `items` batches more than one
| Moment | `items` |
|---|---|
| Verify wallet | 1 × `personal_sign` |
| Repayment | 1 × `eth_signTypedData_v4` |
| Autopay enrollment | 1 × `personal_sign` (consent) + N × `eth_signTypedData_v4` |

We produce a signature **per item, in order**, from the borrower's EVM address,
then reply `{ kind: 'signed', id, signatures }` (or `rejected`).

Today Stealf signs Solana via Turnkey. For Portola we need the **EVM** signing
path on the **Turnkey-derived Ethereum account**:

```ts
// src/features/borrow/lib/portolaSigner.ts (sketch — confirm Turnkey EVM API surface)
export async function signPortolaItem(item, { httpClient, ethAddress }) {
  if (item.method === 'personal_sign') {
    // EIP-191 personal_sign over item.message, from ethAddress
    return turnkeySignMessageEvm(httpClient, ethAddress, item.message);
  }
  if (item.method === 'eth_signTypedData_v4') {
    // EIP-712 typed data
    return turnkeySignTypedDataEvm(httpClient, ethAddress, item.typedData);
  }
  throw new Error(`Unsupported sign method: ${item.method}`);
}
```

**Signature format.** Each entry in `signatures[]` is a standard `0x…` hex string
(EIP-191 for `personal_sign`, EIP-712 for typed data). Portola's relayer splits
the 65-byte sig into `v, r, s` for `transferWithAuthorization` — so return the
joined hex, not split components.

**Turnkey custodial nuance.** With EIP-1193 browser wallets the borrower gets one
approval popup **per item** (a 12-payment autopay = 13 sequential prompts). Stealf
signs via **Turnkey TEE programmatically** — no per-item popup — so we must render
**our own confirmation UI** before signing (especially for autopay consent), then
sign all items server-side and return them in order. Don't require a native-gas
balance and don't force a chain switch just to sign.

> The exact Turnkey EVM helper (high-level EVM signer vs raw `signRawPayload`
> with secp256k1 + keccak256) must be pinned against the installed `@turnkey/*`
> packages — same verification discipline as the on-ramp (install + typecheck).

---

## Part 4 — Gasless repayment & autopay

Borrowers repay **from inside the embed, without holding native gas**. They sign,
Portola's relayer broadcasts and pays the gas. **Our only job is to sign** — we
don't build the authorization, call a relayer, or submit a transaction.

### One-off "Pay now"
1. Borrower taps repay in the embed.
2. Embed builds an **ERC-3009 `TransferWithAuthorization`** for the loan's
   stablecoin and sends it as a `sign` request with one `eth_signTypedData_v4` item.
3. We sign with the borrower's wallet → reply with the signature.
4. Embed submits `{ permit, signature }`; Portola's relayer calls
   `transferWithAuthorization(...)` and pays gas.

The `typedData` is a standard EIP-712 `TransferWithAuthorization` — show the
borrower a meaningful prompt from it:
```jsonc
{
  "primaryType": "TransferWithAuthorization",
  "domain": { "name": "USDC", "version": "1", "chainId": 84532, "verifyingContract": "0x…token" },
  "message": {
    "from": "0x…borrower", "to": "0x…payee",
    "value": "1000000",          // atomic units — USDC 6 decimals → 1.00
    "validAfter": "0", "validBefore": "1745812345", "nonce": "0x…"
  }
}
```
The signature authorizes **exactly** this transfer, nothing else. `to` is fixed
in the signed data and checked against the loan, so a relayer can't redirect funds.

### Autopay (optional)
Enrollment is **one batched `sign`**: `1 × personal_sign` (consent) + `N ×
eth_signTypedData_v4` (one pre-authorized payment per due date). We sign them all
in one round-trip, return one `signatures` array in order. The embed stores them
and submits each on schedule.

- **Consent (`personal_sign`)** is not fund-moving authority — it carries
  `loanId, rail, railProvider, assetRef, presignedPaymentCount, effectiveAt,
  expiresAt, nonce`. Wallets may render it as opaque text.
- **Authority** comes from the typed-data transfers. Each gets its own window:
  `validAfter` = due date (Unix s), `validBefore` = +14 days, independent
  `value/to/nonce`. The **token contract itself** refuses execution before
  `validAfter` — a Portola bug/compromise can't pull a future payment early.
- Reject any item → `kind: "rejected"` and the embed **won't enroll**.
- Turning off autopay revokes the authorization (Portola stops executing;
  it never shares the signatures back to us).

> ⚠️ For Stealf this means an autopay enrollment = up to N+1 Turnkey signatures
> in one go. Surface a **clear consent screen** before signing (since there's no
> per-item wallet popup), and decide whether autopay ships in v1 or later.

### Settlement reality (for the backend)
A successful token tx is **not** the final accounting record. Portola observes
the repayment at the loan's repayment inbox, then posts to its ledger — the user
may briefly see a submitted tx before it appears in history. **Treat the
`loan.payment_received` webhook as the repayment signal**, not a browser event.

## Part 5 — Webhooks (optional, backend-stealf)

Only needed if the backend wants server-to-server notice (the embed already
reports the borrower outcome via `portola:complete`). Set the endpoint URL in the
portal; clear it to stop.

### Receiver
`POST /api/portola/webhook` — body `{ event, data, ts }`, headers:
| Header | Value |
|---|---|
| `X-Portola-Event-Type` | e.g. `funding.completed` |
| `X-Portola-Event-Id` | unique — **dedupe on this** |
| `X-Portola-Timestamp` | unix seconds |
| `X-Portola-Signature` | `t=<unix>,v1=<hmac-sha256-hex>` |

### Verify EVERY delivery
HMAC-SHA256 over **`<timestamp>.<raw body>`**, keyed with the signing secret
(`PORTOLA_WEBHOOK_SECRET`). Verify against the **raw** body *before* parsing,
reject stale timestamps, compare **constant-time**.

> ⚠️ **Backend wiring detail:** the global JSON body parser destroys the raw body.
> This route needs `express.raw({ type: 'application/json' })` (mounted before the
> JSON parser, or a `verify` hook capturing `req.rawBody`) — otherwise the HMAC
> never matches. Mirror this when adding the route.

```ts
// sketch
import crypto from 'crypto';
function verifyPortola(raw: Buffer, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const expected = crypto.createHmac('sha256', secret)
    .update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(parts.v1 ?? '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

### Events
`application.created` · `application.status_changed` (catch-all) ·
`offer.prequal_accepted` · `verification.completed` · `application.signed` ·
**`funding.completed`** (loan active) · **`loan.payment_received`** (repayment
posted) · `application.declined` · `application.withdrawn`.

### Reliability
- **Ack fast**: return `2xx` within **5s** (attempt times out at 10s).
- **Retries**: exp. backoff, up to **7** attempts, honors `Retry-After`, then stops.
- **At-least-once, no ordering**: dedupe on `X-Portola-Event-Id`; read the loan
  for authoritative state.

## Authentication & secrets

| Key | Env | Use |
|---|---|---|
| `pk_test_…` | Sandbox (Base Sepolia) | dev/testing |
| `pk_live_…` | Production | real borrowers |

- The prefix selects the environment automatically; keys are **not** interchangeable.
- **Server-side only.** The session-mint call runs on backend-stealf. Never ship
  the key to the app bundle or a public repo. The app only receives `embedUrl` /
  `sessionId`.
- Rotate by minting a new key and revoking the old one (in the portal).

### Origin allowlist
- Register **every** origin you load the embed from (one per environment) in the
  Portola portal. At least one is required — a mint with no configured origin is
  rejected `403`.
- A session whose `parentOrigin` is not allowlisted is rejected `403`.
- The embed only posts back to the allowlisted origin, so another origin can't
  intercept signature requests.
- **For Stealf this is the host page origin** (e.g. `https://embed.stealf.xyz`),
  per Approach A. If we go standalone (Approach B), confirm what counts as the
  origin for a native WebView with Portola.

---

## Environments

- **Sandbox**: Base Sepolia + an **auto-lender** that approves & funds every
  application → full end-to-end flow (funded, repayable, gas included).
- **Production**: swap `pk_test_` → `pk_live_`, sandbox origin → production
  domain, sandbox chainId → Base mainnet. **Wire contract is identical.**

---

## What's needed to actually ship

### Decisions (Thomas / you)
1. **Borrower wallet** = new Turnkey-derived **EVM account** per user? (No Solana path — Portola is EVM.)
2. **Embed host**: Approach A (host `embed.stealf.xyz` page) vs B (standalone WebView — confirm with Portola).
3. Do we need server-side status (webhooks), or are `portola:complete` + the embed enough?

### Build (once decided)
- [ ] backend-stealf: `POST /api/portola/session` (Zod, `X-API-Key`) + `PORTOLA_*` env.
- [ ] backend-stealf: `POST /api/portola/webhook` with **raw-body HMAC** verify (if webhooks used).
- [ ] Provision/derive a Turnkey **Ethereum account** per user + expose its `0x` address.
- [ ] stealf-app: `npm i react-native-webview`, camera permission, `BorrowFlow` screen.
- [ ] Host page `embed.stealf.xyz/portola` with the bridged controller (Appendix).
- [ ] Turnkey **EVM signing** (`personal_sign`, `eth_signTypedData_v4`, return joined `0x` hex) — verified against installed SDK.
- [ ] **Consent UI** before signing (no per-item wallet popup with Turnkey).
- [ ] On `loan.payment_received` / `funding.completed` → update loan state (don't trust browser events).

### External / yours
- [ ] Portola portal: app approved, origins registered, `pk_test_` issued, brand set.
- [ ] Webhook signing secret issued (ask Portola admin).
- [ ] Production approval for `pk_live_` + Base **mainnet** chainId/asset confirmed at launch planning.

---

## ✅ Verified against installed SDK (no longer open)
- **EVM address derivation** — `httpClient.createWalletAccounts(...)` → `{ addresses }`,
  enums `CURVE_SECP256K1` / `PATH_FORMAT_BIP32` / `ADDRESS_FORMAT_ETHEREUM` present. Silent, idempotent, no user connection.
- **EVM signing** — `httpClient.signRawPayload(s)` present (secp256k1 + keccak256). Need a `viem`/`ethers` digest layer for EIP-191/712.

## ⏳ Still open (not in the docs)
- **Standalone WebView (Approach B)** — confirm with Portola whether `embedUrl` can
  load directly in a native WebView without a host page (origin/postMessage behavior).
- **Production asset matrix** — sandbox is Base Sepolia test USDC; prod chain/token/
  adapter is "confirmed during partner launch planning" — don't hard-code a token standard.

---

## Appendix — host page controller

Adapted from Portola's Quickstart `createEmbedController`, modified so signing is
**delegated to native** instead of handled in-page:

```html
<!-- served at https://embed.stealf.xyz/portola -->
<iframe id="portola" allow="clipboard-write; camera"
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  style="width:100%;height:100%;border:0"></iframe>
<script>
  const embedUrl = new URLSearchParams(location.search).get('embed');
  const iframe = document.getElementById('portola');
  iframe.src = embedUrl;
  const origin = new URL(embedUrl).origin;
  const reply = (msg) => iframe.contentWindow?.postMessage(msg, origin);

  // RN injects signatures back through this:
  window.__portolaReply = ({ id, signatures }) =>
    reply({ portola: 1, kind: 'signed', id, signatures });
  window.__portolaReject = ({ id, message }) =>
    reply({ portola: 1, kind: 'rejected', id, message });

  window.addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow || e.origin !== origin) return;
    const d = e.data;
    if (d && d.portola === 1 && d.kind === 'sign') {
      // forward to native; RN signs via Turnkey EVM and calls __portolaReply
      window.ReactNativeWebView?.postMessage(JSON.stringify(d));
    } else if (d?.type === 'portola:complete' || d?.type === 'portola:session_expired') {
      window.ReactNativeWebView?.postMessage(JSON.stringify(d));
    }
  });
</script>
```
