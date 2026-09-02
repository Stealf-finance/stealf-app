# Store (gift cards) — frontend notes

Companion to the backend's `src/services/bitrefill/BITREFILL.md`. Read this
before changing anything under `src/features/store/`.

## What is wired

Only the **catalog**. One authenticated call, `GET /api/giftcards/products/curated`,
builds the whole Buy tab.

**There is no cart and no favourites.** Both went for the MVP. The cart because
`POST /api/giftcards/orders` takes a single product, so a basket only ever meant
walking it line by line at checkout — you order from the product page instead.
Favourites because nothing ever listed them: `useFavorites` had no consumer but
its own button. `CartContext`, `CartSheet`, `QtyStepper`, `lib/cart.ts`,
`FavoritesContext`, `FavoriteBtn` and `lib/favorites.ts` are in git history.

**Checkout is wired end to end: order → confidential transfer → check.** What
is not wired is everything _after_ payment — no polling, no "My Cards", no code
reveal. The routes exist (`api/orders.ts`); nothing renders them yet.

## Paying

Swiping `BuyConfirmSheet` places the order, then runs an Umbra **confidential
transfer**, ETA → ETA: the buyer's encrypted balance to Stealf's, in one MPC
round-trip. Every figure comes from the order — `amountRaw` for the amount,
`treasuryUmbraAddress` for the destination, `paymentRef` for `optionalData`.
Nothing about the payment is computed locally any more, and
`STORE_TREASURY_ADDRESS` is gone.

**The order is created on swipe, never on sheet open.** One create is one
Bitrefill invoice, so quoting on open would mint an invoice every time someone
browsed a price. The cost is that the sheet cannot show the exact charge before
the swipe; it shows the face value, labelled as an estimate, until the order
answers.

### Why confidential and not a stealth-pool note

The note path (`operations/transfer.ts`, still used by the private send) is
_unlinkable_: the deposit and the receiver's claim cannot be tied together. It
costs a ZK proof on the buyer's phone, and a second proof plus a merkle scan on
the receiver's.

The confidential transfer costs **no ZK proof at all** — the amount is
rescue-encrypted and settled by Arcium's MPC cluster — and the receiver's
balance moves on the callback, with nothing to claim. That is the whole
performance argument, and it is why this path was chosen.

What it gives up: the sender → receiver edge is public. An observer sees _that_
a given wallet paid Stealf, and when, though never how much. Batching Stealf's
withdrawals hides the amounts leaving the treasury; it does not hide the
purchase graph. Any such batching is a treasury policy on Stealf's side — the
app cannot express it.

### Five constraints that will bite

**Devnet only, on SDK rc.4.** The pipeline looks up ALT entries named
`transfer_from_{shared,network}_balance_to_*_v18`. All eight live in the
devnet network config; the mainnet config carries only the older
`*_token_account_{mxe,shared}_transfer_v9` names, which rc.4 never asks for. A
mainnet transfer therefore fails at submit. Moving the Store to mainnet needs an
SDK bump — a deliberate job, see CLAUDE.md.

**Shared-mode senders only.** `getTransferorFunction` runs build + submit for
the four `shared_*` variants; a network-mode sender returns `kind: "prepared"`
with nothing broadcast. `confidentialTransfer` throws on that rather than
reporting a success that never happened. It is also why the SDK's own `.d.ts`
comment — "Build/submit phase not yet wired in" — is stale: the compiled rc.4
does run both stages.

`getTransferorFunction` additionally _requires_ an `executorConfig` dep, unlike
every other operation in this repo, which lets the SDK derive one. All four
fields come off the client.

**The MXE utility-pubkeys flag, patched.** `transfer` is the only operation
that reads the MXE's x25519 key from chain — deposit, burn and query all take
`client.networkConfig.mxePubkey`. It then rejects anything whose
`utilityPubkeys` enum is not `Set`. Umbra's devnet MXE
(`9AutF4oqBAoV1AGXvtco4BJ9JUrA3q3gLMu5iSvWw1Pk`) sits on `Unset` while carrying
a valid key, byte-for-byte the one the SDK ships in its own devnet config, so
shield works and the transfer dies on a flag. The patch trusts the key material
instead: it still throws on absent or all-zero bytes, and warns when it falls
back. `src/services/umbra/__tests__/sdkPatch.test.ts` pins the behaviour on both
builds — Metro bundles the ESM chunk for `@umbra-privacy/sdk/transfer` and the
CJS one for the main entry, so both carry the fix. Drop the patch once Umbra
publishes the keys.

**The 200k compute ceiling, patched.** The SDK never emits a
`SetComputeUnitLimit` instruction, on any operation, and the transfer path does
not forward the `hooks.interceptInstructions` that `executeCorePipeline`
exposes — so the transaction ships a single instruction and inherits Solana's
200,000 CU default. It does not fit: the Arcium `QueueComputation` CPI alone
costs ~64k, and `shared_to_new_shared` creates the receiver's token account on
top, so simulation dies on `exceeded CUs meter at BPF instruction` before
anything is broadcast. The patch prepends a hand-rolled ComputeBudget
instruction (discriminator `2`, u32-LE units) at 600k, scoped to the transfer —
deposit, withdraw and burn all fit in the default and are left alone. Nothing is
paid for the headroom: the SDK sets no compute-unit price, so the priority fee
stays zero whatever the limit.

The `_to_new_*` variants are the expensive ones because they create the
receiver's encrypted token account. Every first transfer to a given
receiver+mint pair takes that path, so the limit has to cover it — the treasury
being warm afterwards is luck, not a design.

**A landed transaction is not a settled transfer.** Solana compute units get the
queue transaction on-chain; the balances only move when Arcium's MPC executes
the computation and fires `CallbackComputation`. Those are two different
budgets, and on devnet the second one is where transfers die: the queue tx
succeeds, `queuedComputationCount` on the sender's ETA climbs, and the
receiver's `generationIndex` stays at 0.

Arcium prices a computation in **ACU**, and the SDK bids `microLamportsPerAcu ??
0n`. The on-chain computation definitions say what that buys:

| computation | `cuAmount` | `circuitLen` |
| ------------------------------------- | ------------- | --------- |
| `deposit_..._into_new_shared_v18`      | 427,266,208   | 248,702   |
| `transfer_..._to_new_shared_v18`       | 1,387,781,166 | 912,388   |
| `transfer_..._to_existing_shared_v18`  | 1,595,534,454 | 1,019,388 |

Deposits settle in ~2s at a zero bid; transfers, at 3.2x the ACU cost, never get
scheduled. `confidentialTransfer` therefore bids
`DEFAULT_MICRO_LAMPORTS_PER_ACU` (1000) instead of nothing — roughly 0.0014 SOL
at the transfer's ACU cost. **This is a hypothesis, not a proven fix**: the
cluster (offset 456) is active with two nodes and every comp-def exists, so the
MXE's `utilityPubkeys: Unset` remains the other candidate. `/dev-transfer`
exposes the bid as a field so the value can be swept without a rebuild.

### Amount and token

`resolvePaymentToken` accepts **only `USDC` and `dUSDC`** in a release build,
and that narrowness is the point. The backend's watcher scans one account —
`findEncryptedTokenAccountPda({ user: treasury, mint: getUsdcMint() })` — so a
transfer in any other mint lands in the treasury and is never seen, never
credited, never refunded. USDT and dUSDT were removed for exactly that reason.

**In `__DEV__` only**, native SOL is accepted as a last resort, after the
stablecoins: a devnet wallet holds faucet SOL and nothing else, so without it
the Store checkout cannot be exercised at all. On that path the charge is a flat
`DEV_SOL_TEST_AMOUNT` (0.001 SOL), never the card price — a €25 card would
otherwise mean 25 SOL — and the order is still created and still carries its
`paymentRef`, so everything but the crediting is exercised. **The watcher will
never see that payment**, so the order sits in `awaiting_payment` until it
expires; the confirmation sheet says so verbatim rather than implying a card is
coming. `allowNative` is `__DEV__`, so a release build cannot reach it.

The mint itself is still read off the balance rather than hard-coded, because
devnet and mainnet disagree. **Confirm the backend's `USDC_MINT` matches the
`dUSDC` the app resolves on devnet** — nothing in the order response names a
mint, so the two sides agree by convention, not by contract.

`estimatedAmountRaw` exists only to gate the swipe before an order exists. It
is never charged: `pay()` re-checks the balance against the order's `amountRaw`
and refuses there too, so a server quote above the local estimate fails loudly
instead of bouncing off Umbra.

`resolvePaymentBlocker` decides whether the swipe is live, in a fixed order:
signer hydrated → in stock → settlement token held → encrypted balance
sufficient → ≥ 0.02 public SOL for fees. It compares `amountRaw` as bigint, not
floats.

## Ordering

`api/orders.ts` transcribes the five money routes. Stealf is the intermediary
now: the user pays **us** with one confidential transfer and we buy the card
from a float we front. The chain shows a transfer between two Umbra accounts
with the amount hidden, and — separately, unlinkably — our treasury paying
merchants.

```
1. POST /orders            → { amountRaw, treasuryUmbraAddress, paymentRef, expiresAt }
2. one confidential transfer  optionalData = paymentRef, verbatim
3. POST /orders/:id/check     "I've paid, go look" — empty body
4. GET  /orders/:id           poll until settled
5. GET  /orders/:id/code      the redemption code
```

Step 3 is what makes delivery feel immediate. It is safe to call more than once
and safe to never call — a 60 s backstop finds the payment either way. **A
failure there is never a failed purchase.** The MPC round-trip means the
balance may not have moved on the first call; two or three retries over ~30 s
are expected and inside the limit.

### Three ways to lose the money

1. **`payment.address` on the order is Bitrefill's deposit address**, an
   invoice we are also about to pay. `StoreOrderSummarySchema` drops the field
   outright rather than warning about it — Zod strips what it does not declare,
   so no consumer can reach it. Pay `treasuryUmbraAddress`.
2. **`paymentRef` is the payment reference itself, not a hash of it.** The
   backend reads those 32 bytes back out of the on-chain instruction
   (`incoming.ts` decodes `optionalData.first`) and matches them against the
   stored ref, with the sender as a second factor. Re-hash it and the payment
   is unattributable. The schema pins it to 64 lowercase hex chars.
3. **Size the transfer with `amountRaw`, never `amountUsdc`.** Crediting gates
   on exact integer equality, and `24.99 * 1e6` is `24989999.999999996` in
   floating point. `orderTransferAmount` in `lib/orders.ts` is the only
   sanctioned conversion.

The SDK does **not** warn when `optionalData` is missing: `prepareTransfer`
substitutes 32 zero bytes. `confidentialTransfer` now takes it as a fourth
argument and throws unless it is exactly 32 bytes, so a truncated ref fails on
the device rather than becoming an unattributable payment.

### Statuses

`failed` is not the end: it means we hold the user's money and owe it back, and
a multi-card order can deliver some cards and fail others, so it still reveals
codes. `expired` is the end and owes nothing. Refunds land in the encrypted
balance the app already shows, so they need no UI of their own. The three
predicates in `lib/orders.ts` encode exactly that split.

Expiry fails **open**: the backend's `markPaid` accepts `awaiting_payment` and
`expired` alike, so a late payment is still credited and blocking the buyer on
an unparseable date would be the worse failure.

### Idempotency

Bitrefill has no idempotency key, so a retried create is a second invoice — a
second charge. Pass a `clientReference` and reuse it on retry; the same
reference returns the same order with the same instructions.
`orderFromConflict` reads the order out of the one case that answers `409`: a
previously quoted order that may still owe a refund, which cannot be recycled.
Mint a new reference for it.

### The code route

`GET /orders/:id/code` is 5 calls / 10 min, the tightest limit in the module,
because each call spends Bitrefill's account-wide quota once per card. Codes
are fetched live and never stored: **do not cache them, log them, or send them
to analytics.** That is why it has no query key.

### Catalog routes

`api/products.ts` adds `/products`, `/products/search` and `/products/:id`.
None of those three has a consumer: the Buy tab is still built from `/curated` in one call and
searches that list locally, for the quota reason under "Quota". They are here
so the order flow is not the only thing that can name a product.

## Layers

| File                            | Role                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `api/curated.ts`                | Zod schemas, query key, `fetchCuratedProducts(token)` |
| `api/products.ts`               | the three uncurated catalog routes                    |
| `api/orders.ts`                 | the five money routes, schemas, 409 readers           |
| `lib/orders.ts`                 | status predicates + the raw-amount conversion         |
| `hooks/useCuratedProducts.ts`   | React Query wrap, token-gated                         |
| `lib/catalog.ts`                | pure helpers over the fetched groups                  |
| `lib/listState.ts`              | which of the four render states applies               |
| `lib/payment.ts`                | settlement token pick, pre-flight blockers            |
| `hooks/useStorePayment.ts`      | order → confidential transfer → check                 |
| `lib/format.ts`, `lib/range.ts` | pure, unit-tested                                     |

## The response is data, not a fixed set

The backend holds the allowlist as a constant (`CURATED_GIFTCARDS`) and
resolves each id against Bitrefill individually. Bitrefill's ids are
per-country and follow no naming rule — `amazon-uk` sits next to
`xbox-ireland` — so they cannot be generated and are hand-verified.

**An id that stops resolving is dropped from the response rather than failing
it.** Never hard-code against a product being present, and never assume a group
is non-empty. Empty groups are omitted server-side.

This is why the "Best Selling" rail was removed: it resolved a hard-coded list
of ids, which is exactly what this contract says not to do, and the whole
curated list is already an editorial selection.

## Two different currencies

`product.currency` is the **card's face value** — a 50 EUR Netflix card is
50 EUR of Netflix credit. It is _not_ what the user pays.

What the user pays is USDC, and that amount only exists on the order response
(`cost`, `costCurrency`, `payment.amount`), computed by Bitrefill at invoice
time. Nothing at catalog level exposes a rate.

Consequences:

- Format every price with `product.currency`, never a screen-level constant.
  `formatMoney` already handles EUR / USD / GBP.
- Do not convert to USD in the client. If a non-USD market is ever kept, the
  rate belongs server-side and must be shown _in addition to_ the face value,
  never instead of it — it would only ever be an estimate, since Bitrefill
  applies its own rate and margin.
- **The old 1:1 gap is closed.** Checkout used to charge the face value 1:1 in
  USDC whatever the currency, which was simply wrong on a EUR/GBP list. The
  backend now quotes `amountRaw` and that is what is charged; the client no
  longer converts anything.

## Brand images

**Bitrefill's `image` field is not a URL — it is an internal slug** (`amazon_uk`,
`2024_logos/netflix_logo`, `nandos-background`). Passing it to `expo-image`
loads nothing. The backend passes it straight through, so the app must not
treat it as a source.

The art is served from a CDN keyed on the **product id**:

```
https://cdn.bitrefill.com/primg/i1w<px>h<px>/<productId>.webp
```

`brandImageUrl(id, size)` builds it, picking a square bucket (64/128/256/512)
big enough for a 3x screen. Verified 200 `image/webp` for all fourteen curated
ids, underscores included (`nando_s-ie`).

`BrandMark` prefers `uri` when it is already an absolute URL — so if the
backend ever normalizes `image` into a real one, that wins with no client
change — and otherwise derives from the id. It falls back to a tinted monogram
when the image fails to load, keyed on the id so a recycled row never inherits
another brand's failure.

Logos are cached `memory-disk`, so the fourteen tiles don't refetch on every
mount.

## The tile grid

Two per row, every tile the same size. `rowsOfTwo` chunks the products; each row
is a flex row, with a spacer when the last row holds one — a `flexWrap` grid
would stretch a lone trailing tile to full width.

**Tile width is an explicit number from `tileWidth(screenWidth)`, not `flex: 1`.**
The first attempt used `flex: 1` on the tile and `width: '100%'` + `aspectRatio`
on the artwork inside it. Yoga resolves that percentage against a width the
aspect ratio is itself still deciding, gives up, and falls back to the intrinsic
size — so each tile rendered full-width and the second column ran off-screen.
Percentage width and `aspectRatio` on the same node is the trap; keep both
dimensions explicit here.

`GRID_GUTTER` (20) and `GRID_GAP` (12) are shared by the grid, the skeleton and
`BrandArt`, so the three can't drift.

A tile is artwork, then name, then denominations — nothing else on it. Tapping
it opens the product, because the denomination is the whole decision on a gift
card and can't be guessed.

Names are shortened for the tile by `shortProductName`: Bitrefill returns
"Amazon.co.uk United Kingdom", which overflows a 170pt tile. It drops the
trailing market word and turns a country-coded TLD into its code — "Amazon UK",
"Zalando", "Currys PC World". The full name is kept on the product detail, and
`searchCatalog` matches both forms so typing what is on screen finds it.

Note the two `Text` nodes carry an explicit `width`. A `Text` under a
fixed-width parent still takes its intrinsic width, so `numberOfLines={1}` had
nothing to truncate against and the name spilled past the tile, pushing the
next column out of the row.

`denominationSummary` returns a **range** (`€200 – €1000`), never a list. A
170pt tile truncates `£1000 · £500 · £200 · …` into noise. Bitrefill does not
sort `packages`, so the range takes the bounds, not the first and last.

### Image URLs

**Bitrefill's `image` field is not a URL — it is an internal slug** (`amazon_uk`,
`2024_logos/netflix_logo`). The art is served from a CDN keyed on the **product
id** instead, in two shapes:

```
/primg/w<w>h<h>/<id>.webp      the brand's own 5:3 card artwork
/primg/i1w<n>h<n>/<id>.webp    the square logo, letterboxed on a flat ground
```

`brandArtUrl` builds the first, which is what the tiles and the product hero
use. The square form has no consumer since the cart went — rebuild it from the
pattern above when "My Cards" needs small marks. Verified 200 `image/webp` for
all fourteen curated ids, underscores included (`nando_s-ie`).

`BrandArt` falls back to a tinted monogram when the image fails to load, keyed
on the id so a recycled tile never inherits another brand's failure. Artwork is
cached `memory-disk`.

## Four render states

`resolveStoreState(groups, error)` in `lib/listState.ts`:

| State         | When              | UI                       |
| ------------- | ----------------- | ------------------------ |
| `groups`      | data present      | the sections             |
| `skeleton`    | no data, no error | placeholder tiles        |
| `unavailable` | HTTP 503          | "not available yet" copy |
| `error`       | any other failure | retry copy               |

Two rules encoded there:

1. **A value always wins.** A failed background refetch never blanks a catalog
   already on screen.
2. **The signal is the absence of a value, not `isLoading`.** The query is held
   disabled until the session token hydrates, and a disabled React Query reports
   `isLoading: false` with no data.

503 is separated from `error` on purpose: every `/api/giftcards` route answers
`503 {"error":"Gift cards are not available yet"}` until the backend holds
Bitrefill credentials (`BITREFILL_API_KEY`, or `BITREFILL_API_ID` +
`BITREFILL_API_SECRET`). That is a permanent, expected state with its own copy —
not a transient failure worth retrying.

## Header and market

`StoreHeader` is the shared `ScreenHeader` (`top="hero"`, store icon, country
pill on the right) followed by the search + cart row. Gutter is 20, not the
usual 24, so tile edges line up with the header. See
`.claude/docs/screen-patterns.md`.

**The country pill shows the market, and the market is derived, not configured.**
The products disagree: the live Irish list is 10 `IE`, 3 `EU` (pan-European
products with no Irish equivalent) and 1 `GB` (`amazon-uk`). So
`dominantCountry` takes the mode, which gives `IE` today and would give `US`
for a US list with no client change. Ties break alphabetically so the result is
stable. If the backend ever returns an explicit market field, prefer it and
delete this.

The pill is display-only. It is not a selector — the market is decided by the
backend's allowlist. Its width is what forced `ScreenHeader` to centre the
title on the row rather than balance it against the back chevron.

## Filtering

**Removed for now**, on request. `FilterSheet.tsx` and the
`filterByGroups` / `filterInStock` helpers are gone; recover them from git
history rather than rewriting when the filter comes back. Search is still local
and still covers the whole catalog.

## Quota

Bitrefill's product endpoints share a hard 1000 requests/hour across the whole
platform. The backend caches for an hour; the client mirrors that with a
1-hour `staleTime` and does not retry a 503. Search and filtering are local —
the curated call returns the whole list, so re-querying the server per keystroke
would spend a shared quota to reorder fourteen items already in memory.

## Naming drift, deliberate

`components/CategorySection.tsx` renders _groups_, not categories. The file was
not renamed because file renames need sign-off (CLAUDE.md rule 1). Worth doing
in a follow-up.
