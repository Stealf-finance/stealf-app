# Store (gift cards) — frontend notes

Companion to the backend's `src/services/bitrefill/BITREFILL.md`. Read this
before changing anything under `src/features/store/`.

## What is wired

Only the **catalog**. One authenticated call, `GET /api/giftcards/products/curated`,
builds the whole Buy tab. Buying is not wired: the cart is local and its
checkout is inert. `POST /orders`, the USDC payment leg and the code reveal are
later slices.

## Layers

| File                                           | Role                                                  |
| ---------------------------------------------- | ----------------------------------------------------- |
| `api/curated.ts`                               | Zod schemas, query key, `fetchCuratedProducts(token)` |
| `hooks/useCuratedProducts.ts`                  | React Query wrap, token-gated                         |
| `lib/catalog.ts`                               | pure helpers over the fetched groups                  |
| `lib/listState.ts`                             | which of the four render states applies               |
| `lib/format.ts`, `lib/range.ts`, `lib/cart.ts` | pure, unit-tested                                     |

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
- **Known gap:** `cartTotal` sums line prices as plain numbers. If the curated
  list ever mixes currencies (the Irish list does — `amazon-uk` is GBP, the
  rest EUR), the cart total is meaningless. This is unresolved and waiting on
  the market decision. A US-only list makes it moot.

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

A tile is artwork, then name, then denominations. No Buy button: tapping the
tile opens the product, because the denomination is the whole decision on a
gift card and can't be guessed.

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

### Two image shapes

The CDN serves both, and they are not interchangeable:

| Builder | Path | What it is |
|---|---|---|
| `brandIconUrl` | `/primg/i1w<n>h<n>/` | square logo, letterboxed on a flat ground |
| `brandArtUrl` | `/primg/w<w>h<h>/` | the brand's own 5:3 card artwork |

The tile uses `brandArtUrl` (that black Amazon card is the real artwork, not a
logo on a tint); `BrandMark` still uses `brandIconUrl` for the small square
marks in the cart and on the detail header. Both fall back to a tinted monogram
when the image fails.

## Product detail

Artwork hero, name, then the amount picker: `−` / big value / `+`, and a
slider under it. The slider **snaps to the product's denominations** — there
are no values between them — so it is a picker, not a free input. Chips were
tried first and dropped: products carry 5 to 13 denominations, which is a lot
of little labels for a phone.

`lib/slider.ts` carries a `'worklet'` directive on both functions. The pan
gesture's `onEnd` runs on the UI thread, and calling a plain imported JS
function from there crashes the app the moment you release the thumb — which is
exactly what it did. Anything the gesture calls must be workletized.

`denominations()` sorts ascending and de-duplicates, because Bitrefill returns
them in no order at all (Amazon descends, IKEA ascends). A product with no
packages but a range gets eight proposed steps snapped to its `step`, so an
open-amount product stays buyable; those carry no `packageId`, which is what
the order endpoint expects for a ranged purchase.

**No quantity control here** — one tap adds one card, and the cart's own
stepper changes the count. The mock has none either.

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
