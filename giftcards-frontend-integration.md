# Gift cards — frontend integration

Everything the app needs to buy a gift card now that **Stealf is the intermediary**: the
flow, the routes, the Umbra transfer, and the types. Self-contained — you should not need to
read backend source to wire this.

Backend side, if you want the why: [UMBRA.md](../src/services/umbra/UMBRA.md),
[TREASURY.md](../src/services/treasury/TREASURY.md),
[BITREFILL.md](../src/services/bitrefill/BITREFILL.md).

Branch `feat/giftcards-umbra-intermediary`. Not on `development` yet.

## What changed

The user no longer pays Bitrefill. They pay **us**, with one confidential Umbra transfer, and
we buy the card from a float we front.

```
before   app → POST /orders → Bitrefill's deposit address → user sends USDC publicly
after    app → POST /orders → OUR Umbra address → user sends a confidential transfer
                                                → we detect it, we buy the card
```

The chain no longer shows a wallet paying a gift-card merchant. It shows a confidential
transfer between two Umbra accounts with the amount hidden, and — separately, unlinkably —
Stealf's treasury paying merchants.

## The three traps

Read these before the rest. Each one costs money or a stuck order.

1. **`payment.address` in the order response is Bitrefill's deposit address and is no longer
   the user's business.** It stays in the payload because the row still records it. Sending
   funds there means paying an invoice we are also about to pay. **Send to
   `treasuryUmbraAddress`.**
2. **`optionalData` is the payment reference itself, not a hash of it.** The backend reads
   those 32 bytes back out of the on-chain instruction and matches them against the stored
   `paymentRef`. Re-hashing produces a payment nobody can attribute — a refund and a confused
   user.
3. **Size the transfer with `amountRaw`, never `amountUsdc`.** Crediting gates on exact
   equality against the raw integer. `24.99 * 1e6` in floating point is `24989999.999999996`,
   and a payment that misses by one base unit is never credited.

## The flow

```
1. POST /api/giftcards/orders          → { amountRaw, treasuryUmbraAddress, paymentRef, expiresAt }
2. one confidential Umbra transfer       optionalData = paymentRef, verbatim
3. POST /api/giftcards/orders/:id/check  "I've paid, go look" — empty body
4. GET  /api/giftcards/orders/:id        poll until terminal
5. GET  /api/giftcards/orders/:id/code   the redemption code
```

Step 3 is what makes delivery feel immediate. It is safe to call more than once and safe to
never call — a 60 s backstop finds the payment either way, just slower. **Never treat a
failure of step 3 as a failed purchase.**

## Routes

Every route is `verifyAuth` (Turnkey session JWT). Every success is `{ data: T }`; every
failure is `{ error: string }`, with one exception noted under the code reveal.

| Route                                                          | Limit (per user) | Returns                               |
| -------------------------------------------------------------- | ---------------- | ------------------------------------- |
| `GET /api/giftcards/products?country=&category=&start=&limit=` | global           | `NormalizedProduct[]`                 |
| `GET /api/giftcards/products/search?query=&start=&limit=`      | global           | `NormalizedProduct[]`                 |
| `GET /api/giftcards/products/curated`                          | global           | `{ groups: CuratedGroup[] }`          |
| `GET /api/giftcards/products/:id`                              | global           | `NormalizedProduct`                   |
| `POST /api/giftcards/orders`                                   | 10 / 10 min      | `GiftCardPaymentInstructions`         |
| `POST /api/giftcards/orders/:id/check`                         | 20 / min         | `GiftCardOrderSummary`                |
| `GET /api/giftcards/orders`                                    | global           | `GiftCardOrderSummary[]` (100 newest) |
| `GET /api/giftcards/orders/:id`                                | 60 / min         | `GiftCardOrderSummary`                |
| `GET /api/giftcards/orders/:id/code`                           | **5 / 10 min**   | `NormalizedRedemption[]`              |

Rate limiting is **disabled outside production**, so dev will not show you a `429` you will
meet in prod.

## 1. Create the order

```jsonc
// POST /api/giftcards/orders
{
  "productId": "amazon-uk",
  "packageId": "amazon-uk<&>25", // fixed denomination
  // "value": 25,                  // …or this, for ranged products. Exactly one.
  "quantity": 1, // ≤ 20, default 1
  "clientReference": "…", // optional, unique per user
}
```

`refundAddress` **no longer exists** on this endpoint — refunds are ours to route, and a
client-supplied address would redirect money we fronted. Sending it is ignored, not an error.

```jsonc
// 201 — the fields that matter
{
  "data": {
    "id": "66f1…",
    "status": "awaiting_payment",
    "amountRaw": "24990000", // RAW USDC base units, as a STRING
    "amountUsdc": 24.99, // display only
    "treasuryUmbraAddress": "8Yxw…Us2", // send here
    "paymentRef": "a3f1…", // 64 lowercase hex chars = 32 bytes
    "expiresAt": "2026-09-02T14:30:00.000Z", // 30 min window
    "productName": "Amazon UK",
    "quantity": 1,
  },
}
```

`treasuryUmbraAddress` is the same on every order — it is our own account, not a per-order
deposit address, so it is cacheable. `paymentRef` is **not**: it is unique per order and it
is what carries the attribution.

### Idempotency

Bitrefill has no idempotency key, so a retried create is a second invoice — a second charge.
Pass a `clientReference` and reuse it on retry: a repeat returns the **same** order with the
same payment instructions.

One case answers `409`: a previously quoted order that failed may still owe the user a
refund, so it cannot be recycled under the same reference. Mint a new one. A failure that
happened _before_ we quoted a price retries in place normally.

## 2. The confidential transfer

The only new on-chain work in the app. `getTransferorFunction` from
`@umbra-privacy/sdk/transfer`, which `services/umbra/` does not use today.

```ts
import { getTransferorFunction } from "@umbra-privacy/sdk/transfer";
import { hexToBytes } from "@noble/hashes/utils.js";
import { address } from "@solana/kit";

const client = await getActiveClient();

const transfer = getTransferorFunction(
  { client },
  {
    // REQUIRED. rc.4 does NOT derive this from the client, whatever the JSDoc
    // says — it throws UmbraError { code: "TRANSFER_MISSING_EXECUTOR_CONFIG" }
    // for every shared-sender transfer, which is every transfer we make.
    // Verified in the built .js, not the .d.ts.
    executorConfig: {
      signer: client.signer,
      getLatestBlockhash: client.blockhashProvider,
      transactionForwarder: client.transactionForwarder,
      computationMonitor: client.computationMonitor,
    },
  },
);

const result = await transfer({
  receiverAddress: address(data.treasuryUmbraAddress),
  mint: USDC_MINT,
  transferAmount: BigInt(data.amountRaw) as never,
  optionalData: hexToBytes(data.paymentRef), // 32 bytes, VERBATIM
});

if (result.kind !== "submitted") {
  // Nothing was broadcast. Surface it; do not call /check.
}
```

`TransferResult` is a discriminated union — `kind: "prepared"` means nothing was sent. Check
it; a resolved promise is not a broadcast.

The user's account must be registered (`isUserAccountX25519KeyRegistered`) for a
shared-sender transfer; `checkRegistrationStatus` already covers this. The treasury's own
registration is the backend's problem.

## 3. Tell the backend to look

`POST /api/giftcards/orders/:id/check`, **empty body**. Call it once the transfer resolves.

It says _when_ to look, never _what_ to believe: the wallet and the amount come from the
order row, so anything in the body is ignored. It answers `200` with the current summary
whatever that is — including when another tick already holds the lock, which is normal.

The MPC round-trip means the balance may not have moved on your first call. Retrying two or
three times over ~30 s is expected and inside the limit.

## 4. Poll the status

| status             | what to show                                           |
| ------------------ | ------------------------------------------------------ |
| `creating`         | transient; you should not observe it                   |
| `awaiting_payment` | waiting for the transfer, or for us to see it          |
| `paid`             | payment verified — buying the card                     |
| `submitted`        | **we** paid the invoice, waiting on Bitrefill          |
| `delivered`        | code available                                         |
| `failed`           | could not deliver — **a refund is owed and will come** |
| `refunding`        | refund in flight to the encrypted balance              |
| `refunded`         | money returned                                         |
| `expired`          | window closed unpaid — nothing was taken               |

`failed` is **not** the end: it means we hold the user's money and owe it back. Do not render
it as a dead order. `expired` is the end and owes nothing.

Refunds need no UI of their own — they land in the encrypted balance the app already shows.

## 5. Reveal the code

`GET /api/giftcards/orders/:id/code` — the tightest limit in the module, because each call
spends Bitrefill's account-wide quota once per card on the order.

Only `delivered`, `failed` and `refunded` can reveal; anything else answers `409` **with the
current status alongside the error**, so you do not need a second round-trip to know where
the order stands. `failed` is revealable on purpose: a multi-card order can have delivered
some and failed others, and the delivered ones must stay reachable.

Codes are fetched live and never stored. Do not cache them, log them, or send them to
analytics.

## Errors

| code            | when                                                          | what to do                  |
| --------------- | ------------------------------------------------------------- | --------------------------- |
| `503`           | Bitrefill or the treasury is unconfigured on that deployment  | the feature is off; hide it |
| `409` on create | the reference belongs to a quoted order that may owe a refund | new `clientReference`       |
| `409` on code   | not revealable yet — body carries `status`                    | keep polling                |
| `400`           | malformed order id                                            | client bug                  |
| `404`           | not your order, or gone                                       | —                           |
| `429`           | over a limit                                                  | back off                    |

## Types

Transcribed from the backend, not reconstructed. Drop into
`src/features/giftcards/api-types.ts` or wherever it fits.

```ts
/* ── catalog ── */

export interface NormalizedProduct {
  id: string;
  name: string;
  country?: string;
  currency?: string;
  image?: string;
  inStock: boolean;
  /** Fixed denominations. A product line uses EITHER a packageId OR a value. */
  packages: NormalizedPackage[];
  /** Ranged products only. */
  range?: { min?: number; max?: number; step?: number; priceRate?: number };
}

export interface NormalizedPackage {
  packageId: string;
  value: string;
  price?: number;
}

export type GiftCardGroup = "ecommerce" | "gaming" | "streaming" | "food";

export interface CuratedGroup {
  group: GiftCardGroup;
  /** Empty groups are omitted; group order is fixed, so render as returned. */
  products: (NormalizedProduct & { group: GiftCardGroup })[];
}

/* ── orders ── */

/**
 * `submitted` means WE paid the invoice — the meaning changed when Stealf
 * became the intermediary. `failed` owes a refund; `expired` owes nothing.
 */
export type GiftCardOrderStatus =
  | "creating"
  | "awaiting_payment"
  | "paid"
  | "submitted"
  | "delivered"
  | "failed"
  | "refunding"
  | "refunded"
  | "expired";

export interface GiftCardOrderSummary {
  id: string;
  status: GiftCardOrderStatus;
  productId: string;
  productName: string;
  currency?: string;
  packageId?: string;
  value?: number;
  quantity: number;
  cost?: number;
  costCurrency?: string;
  /**
   * ⚠️ Bitrefill's own deposit address — ours to pay, not the user's.
   * Never send funds here. Pay `treasuryUmbraAddress` instead.
   */
  payment?: {
    method?: string;
    address?: string;
    amount?: number;
    currency?: string;
  };
  bitrefillInvoiceId?: string;
  lastKnownStatus?: string;
  createdAt: string;
}

export interface CreateGiftCardOrderRequest {
  productId: string;
  /** Exactly one of packageId (fixed) or value (ranged). */
  packageId?: string;
  value?: number;
  /** 1–20, default 1. */
  quantity?: number;
  /** Unique per user. Reuse on retry — Bitrefill has no idempotency key. */
  clientReference?: string;
  /** Optional audit trail only; nothing is gated on it. */
  paymentSignature?: string;
}

/** 201, and also 200 on an idempotent `clientReference` retry. */
export interface GiftCardPaymentInstructions extends GiftCardOrderSummary {
  /** RAW USDC base units, as a string. Size the transfer with THIS. */
  amountRaw: string;
  /** Display only. */
  amountUsdc?: number;
  /** Constant across orders — our account, not a per-order deposit address. */
  treasuryUmbraAddress: string;
  /** 64 lowercase hex chars = 32 bytes. Send as `optionalData`, verbatim. */
  paymentRef: string;
  /** 30-minute window. */
  expiresAt: string;
}

/** 409 on create — the reference belongs to an order we already quoted. */
export interface CreateOrderConflict {
  error: string;
  data: GiftCardOrderSummary;
}

/* ── redemption ── */

export interface NormalizedRedemption {
  code?: string;
  pin?: string;
  link?: string;
  instructions?: string;
  other?: string;
  barcodeFormat?: string;
  barcodeValue?: string;
  expirationDate?: string;
  giftUrl?: string;
}

/** 409 on the code route — carries the current status alongside the error. */
export interface RevealCodeError {
  error: string;
  status: GiftCardOrderStatus;
}

/* ── envelopes ── */

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string };
```

## Not built yet

- The treasury's Umbra registration and its first funding are operator steps, not code.
  Until they are done, every gift-card money route answers `503`.
- The backend runs Umbra on **devnet** config while Bitrefill orders are real money. The full
  path is only testable end to end once Umbra moves to mainnet; until then, test the two
  halves apart.
- A whole-branch review found three composition defects in the settlement side (the sweep and
  the ledger invariant). They are being fixed and do **not** change any shape in this
  document — but the feature is not mergeable until they land.
