# Screen patterns

The canonical scaffold for **modal / list / form screens** (Send, History,
Claims, Cash, Receive, …). Follow this for every new screen so the app reads
as one system. Pinned 2026-07-22.

This is a **visual/layout** contract. It sits on top of the strict 3-layer
pattern (`api/` → `hooks/` → `screens/`) documented in CLAUDE.md — that still
applies. This doc only covers how a screen is composed and styled.

> **Reference implementation:** `src/features/bank/screens/TransactionsScreen.tsx`
> (the History screen). When in doubt, copy History. `src/features/send/SendFlow.tsx`
> is a second worked example.

---

## The shell

```tsx
<CenterGlow tone={tone} flat>
  {/* header */}
  {/* body (ScrollView or steps) */}
</CenterGlow>
```

- **`CenterGlow` is the root of every screen.** It paints the black `T.bg`
  shell and, optionally, the centered radial haze.
- **`flat` → no haze.** Use `flat` for menu / list / form screens where the
  hierarchy comes from glass surfaces and content, not from a glow. This is
  the default for new screens.
- **Omit `flat` (haze on)** only for hero / balance screens where the glow is
  the focal point (e.g. wallet-detail balance). Don't sprinkle the glow on
  forms — it fought the content, which is why we removed it from Send.

---

## The header

One header, three presentation modes. Same visual result; only `paddingTop`
changes with how the route is presented.

```tsx
<View
  style={{
    paddingTop: 20,          // ← see the paddingTop rule below
    paddingBottom: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  }}
>
  <GlassBackButton onPress={handleBack} />
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text
      style={[
        sansation,
        {
          fontSize: 22,
          lineHeight: 28,
          fontWeight: '600',
          color: T.ink,
          includeFontPadding: false,
        },
      ]}
    >
      {title}
    </Text>
    {/* Optional subtitle */}
    {subtitle ? (
      <Text
        style={[
          sansation,
          { fontSize: 14, lineHeight: 20, color: T.inkDim, marginTop: 4 },
        ]}
      >
        {subtitle}
      </Text>
    ) : null}
  </View>
  <View style={{ width: 26 }} />
</View>
```

### The `paddingTop` rule

`insets.top` is **not reliable inside an iOS modal card** — it returns a value
that pushes the title too low. Pick `paddingTop` by how the route is registered
in `app/_layout.tsx`:

| Presentation | `paddingTop` | Example |
|---|---|---|
| `presentation: 'modal'`, aligned to a hero screen | `insets.top` | `/send/flow` |
| `presentation: 'modal'`, History style (title high) | `20` (fixed) | `/transactions` |
| Tab screen (inside `(tabs)`) | `insets.top + 8` | History tab (`embedded`) |
| Full-screen pushed (no modal) | `insets.top` | wallet-detail (Cash/Wallet/…) |

If a component is reused across modes (History is both a modal and a tab), gate
it on a prop: `paddingTop: embedded ? insets.top + 8 : 20`.

> **Decision (2026-07-22, Thomas):** `SendFlow` uses **`insets.top`** so its
> title lands at the same perceived height as the wallet-detail (`WalletScreen`)
> title, which sits at `insets.top + 16`. We first tried a fixed `20` (History's
> value) but Thomas chose to align Send with the wallet screens instead. Net: two
> header-height archetypes coexist — **hero/wallet-aligned** (`insets.top`-based)
> and **History form/list** (fixed `20`). Pick per screen; don't assume one.

### Back button

- **`GlassBackButton`** — a bare chevron, no chrome. The standard for these
  screens. (`BackBtn`, the chevron-in-a-glass-pill, and the legacy 32pt
  `PageTitleHeader` are older; don't reach for them on new screens.)
- Balance it with a **`<View style={{ width: 26 }} />`** spacer on the right so
  the centered title is optically centered against the 26px chevron.
- On a tab/embedded screen with no back affordance, render the back button as
  `null` (and drop the spacer too).
- Wire `onPress` to the screen's own back handler (e.g. `handleBack` steps a
  wizard back before closing) — not blindly to `router.back()`.

### Title typography

- `sansation`, **22 / lineHeight 28 / weight 600**, `color: T.ink`,
  `includeFontPadding: false`.
- **Sentence case** — "Choose a recipient", never "Choose A Recipient". See
  `docs/glossary.md` for the copy contract.
- Optional subtitle directly under it: `sansation` **14 / lineHeight 20**,
  `T.inkDim`, `marginTop: 4`.
- Do **not** use the old 32pt centered `PageTitleHeader` for new screens.

---

## The body

- Scrollable content goes in a `ScrollView` with
  `contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + (embedded ? 96 : 32) }}`
  and `showsVerticalScrollIndicator={false}`. The extra bottom pad on tabs
  clears the floating nav.
- Primary CTA is a **`PillBtn variant="primary" tone={tone}`** pinned near the
  bottom with `paddingBottom: insets.bottom + 24`.
- Small inline chips (Paste, Max, QR, …) share one look: height `34`,
  `borderRadius: 17`, `backgroundColor: 'rgba(255,255,255,0.04)'`,
  `borderWidth: 1`, `borderColor: S.hairline`, accent-colored content.

---

## Tone & palette

- `const S = txPalette(tone)` gives the per-tone tokens (`S.ink`, `S.inkDim`,
  `S.inkFaint`, `S.accent`, `S.hairline`).
- **`silver`** is the default (bank / public). **`gold`** is stealth /
  encrypted. Thread `tone` from the route params down through the screen and
  into `CenterGlow`, `PillBtn`, `txPalette`.

---

## Don'ts

- Don't modify the shared `PageTitleHeader` to fit a new screen — it's used by
  ~10 legacy screens. Build the header inline per the snippet above. (If enough
  screens adopt this pattern, extract a shared `ScreenHeader` primitive in a
  dedicated PR — until then, inline.)
- Don't use `insets.top` for the header of a `modal`-presented route.
- Don't turn the `CenterGlow` haze on for a form/list screen.
- Don't hardcode colors — go through `T` / `txPalette(tone)`.
