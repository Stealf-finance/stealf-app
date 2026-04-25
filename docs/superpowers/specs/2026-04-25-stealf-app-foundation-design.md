# Stealf App v2 — Foundation & Implementation Plan

**Date:** 2026-04-25
**Status:** Approved (high-level), pending spec review
**Source:** `Maquette.html` at repo root (web React prototype, single-file)

## 1. Goal & scope

Refonte UI/UX d'une néobank crypto Solana axée confidentialité. Cette spec couvre la **fondation** + le **plan de phases** pour transposer la maquette web en app Expo / React Native native.

**Hors scope :** intégration des services existants (auth, wallets Turnkey/maison, Solana RPC). Les écrans sont implémentés en présentation pure avec des données mockées ; le branchement de la logique sera fait dans une itération séparée.

## 2. Design language (tiré de Maquette.html)

**Identité.** Dark, éditorial, luxueux. *« Hold crypto. Spend cash. Stay invisible. »*

**Système bicéphale (clé du produit) :**
- **Silver tone** = couche **Bank** (transparente, publique). Wallet Turnkey.
- **Gold tone** = couche **Stealth** (privée, confidentielle). Wallet custom.

Cette dualité doit traverser tout le code : un même flow (ex : Tx) a deux variantes de tonalité, un même composant accepte un prop `tone: 'silver' | 'gold'`.

### 2.1 Tokens

| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#0a0a0a` | Fond principal |
| `bgRaised` | `#151513` | Cards, surfaces élevées |
| `bgRaised2` | `#1e1d1a` | Surfaces niveau 2 |
| `bgCard` | `rgba(255,255,255,0.03)` | Card glass faible |
| `bgCardStrong` | `rgba(255,255,255,0.06)` | Card glass fort |
| `bgLight` / `bgLightInk` | `#e8e0d0` / `#0a0a0a` | Cards inversées |
| `ink` | `#f1ece1` | Texte principal |
| `inkDim` / `inkFaint` / `inkMute` | 0.65 / 0.4 / 0.25 | Hiérarchies texte |
| `hairline` / `hairlineStrong` | 0.09 / 0.18 | Borders |
| `trace` | `rgba(241,236,225,0.04)` | Borders très faibles |
| `gold` | `#c9a86a` | Accent privé / italics |
| `goldDim` / `goldFaint` / `goldGlow` | 0.5 / 0.15 / 0.28 | Halos, glows |
| `green` | `#7ea688` | Reçu / positif |
| `red` | `#d1604a` | Envoyé / négatif |

### 2.2 Typographie

- **Sansation** (300/400/700 + italic) — primaire. Fallback **Manrope** (Google Fonts) en attendant les `.ttf`.
- **Cormorant Garamond** italic — accents éditoriaux (montants, kickers décoratifs, mots dorés).
- **JetBrains Mono** — chiffres techniques, hashes, addresses.

### 2.3 Primitives partagées

Reproduites depuis `screens-shared.jsx` de la maquette :

`Frame`, `StatusBar`, `HomeIndicator`, `Kicker`, `Em`, `ActionBtn` (circular, accent variant), `TabBar` (5 tabs), `TopNav`, `Dots`, `BalanceLarge`, `TxRow`, `CarouselBar`, `Icons` (set ~40 SVG).

### 2.4 Effets web → équivalents RN

| Web | React Native |
|---|---|
| `backdrop-filter: blur` | `<BlurView>` (`expo-blur`) |
| `linear-gradient` | `<LinearGradient>` (`expo-linear-gradient`) |
| `radial-gradient` | `<Svg><RadialGradient/></Svg>` (`react-native-svg`) |
| `box-shadow` (multi + glow) | `shadow*` props iOS + `elevation` Android, parfois superposition d'absolutes semi-transparents |
| `aspect-ratio` | OK natif |
| Numpad / claviers custom | Composants custom |
| Swipe-to-send | `react-native-gesture-handler` + `Reanimated` |

## 3. Stack & dependencies

**Déjà en place (template Expo SDK 54) :**
- React 19, RN 0.81, Expo Router 6, New Architecture, React Compiler
- Reanimated 4, Gesture Handler, Safe Area Context, Screens
- Expo Font, Expo Symbols, Expo Haptics, Expo Image, Expo Linking, Expo Splash Screen
- TypeScript strict, ESLint Expo, alias `@/*`

**À ajouter :**

```
nativewind
tailwindcss
react-native-svg
expo-blur
expo-linear-gradient
@expo-google-fonts/manrope          # fallback Sansation
@expo-google-fonts/cormorant-garamond
@expo-google-fonts/jetbrains-mono
react-native-reusables               # composants accessibles base shadcn-style
```

NativeWind est configuré avec un `tailwind.config.js` qui réplique l'objet `T` en tokens Tailwind (`colors`, `fontFamily`, `fontSize`). Le but : la majorité des composants est écrite en classes utilitaires, les rares cas exotiques (radial-gradient, boxShadow complexe) restent en `style={}`.

## 4. Folder structure

Approche **feature-based** plutôt que type-based, alignée sur les chapitres de la maquette :

```
app/                              # Expo Router routes (navigation)
  _layout.tsx
  index.tsx                       # redirige vers /(auth)/welcome ou /(tabs)/bank
  (auth)/                         # stack onboarding
    _layout.tsx
    welcome.tsx
    invite.tsx
    handle.tsx
    email.tsx
    inbox.tsx
    login.tsx
    loading.tsx
  (tabs)/                         # main app après login
    _layout.tsx                   # TabBar (Bank · Stealth · Moove · Invest · Profile)
    bank.tsx
    stealth.tsx
    moove.tsx
    invest.tsx
    profile.tsx
  send/                           # transaction flow — modal stack (silver/gold via param)
    _layout.tsx
    select-asset.tsx
    recipient.tsx
    amount.tsx
    confirm.tsx
    success.tsx
  shield.tsx                      # bank → stealth (modal)
  unshield.tsx                    # stealth → bank (modal)
  add-funds.tsx                   # modal
  card.tsx                        # modal détail card
  tx/[id].tsx                     # tx detail (modal)
  lock.tsx                        # passcode / face id (full-screen modal)

src/
  design-system/
    tokens.ts                     # T, semantic tokens, espacements
    typography.ts                 # familles, tailles, helpers Em
    icons/                        # set Icons.tsx (SVG via react-native-svg)
    primitives/                   # composants atomiques
      Frame.tsx
      StatusBar.tsx
      HomeIndicator.tsx
      Kicker.tsx
      ActionBtn.tsx
      BalanceLarge.tsx
      TxRow.tsx
      Dots.tsx
      CarouselBar.tsx
      TabBar.tsx
      TopNav.tsx
    palettes.ts                   # txPalette(tone) silver|gold
  features/
    onboarding/
      screens/                    # OnbWelcome, OnbInviteCode, ...
      components/                 # composants spécifiques au flow
    bank/
      screens/BankHub.tsx
      components/
    stealth/
      screens/StealthHub.tsx
      components/Shield.tsx, Unshield.tsx, ClaimPending.tsx
    moove/
      screens/Moove.tsx
      components/AddFunds.tsx
    profile/
      screens/Profile.tsx
    tx/
      screens/SelectAsset.tsx, Recipient.tsx, Amount.tsx, Confirm.tsx, Success.tsx
      components/SwipeToSend.tsx, NumPad.tsx, AssetPill.tsx, RecipientRow.tsx
    grow/
      screens/Grow.tsx
    card/
      screens/Card.tsx
  navigation/                     # types de routes, helpers Expo Router
  hooks/                          # use-tone, use-haptic-press, etc.
  lib/                            # utils (format, mocks)
  mocks/                          # fixtures pour les écrans

assets/
  fonts/Sansation/                # quand fournis
  images/

global.css                        # NativeWind entrypoint
tailwind.config.js
metro.config.js                   # mise à jour pour NativeWind
babel.config.js
```

**Conventions :**
- Pas de barrel files (`index.ts` qui re-exporte) sauf nécessaire — imports directs.
- Un fichier = un composant exporté nommé par défaut quand c'est une route Expo Router (contrainte du framework), nommé pour les autres.
- Les écrans (`features/*/screens/*.tsx`) ne contiennent pas de logique métier ; ils consomment des hooks ou des props. Les routes (`app/**/*.tsx`) sont des wrappers minces qui importent l'écran et passent les params.
- Tonalité : composants de `features/tx`, `features/moove`, `features/stealth` acceptent `tone: 'silver' | 'gold'`. Hook `useTone()` lit le contexte de route.

## 5. Navigation

```
Root Stack
├─ (auth)               # initialRoute si non loggé
│  └─ Stack: welcome → invite → handle → email → inbox → loading
│  └─ login (alt entry)
└─ (tabs)               # initialRoute si loggé
   ├─ bank
   ├─ stealth
   ├─ moove (presentation: bottom sheet ou modal full)
   ├─ invest
   └─ profile

Modals (presentation: modal):
├─ send/* (5 steps stack interne, tonalité passée en route param)
├─ shield, unshield, add-funds
├─ card, tx/[id]
└─ lock (full-screen, sans header)
```

`onb-loading` joue le rôle de splash transitionnel (vers `(tabs)/bank` après auth ok).

## 6. Phases

Marqueurs : ✅ approuvé, 🔄 implémentation à venir, ⏸ après validation phase précédente.

### Phase 0 — Fondation 🔄
- Nettoyer le template Expo (supprimer composants démo non utilisés)
- Installer & configurer les libs listées en §3
- `tailwind.config.js` complet avec tous les tokens
- Charger les 3 polices via `expo-font` (avec fallback)
- Créer `src/design-system/` complet : tokens, typography, palettes, icons, primitives
- Setup Expo Router structure de §4 (squelettes vides, navigation câblée)
- Premier "Hello world" sur la Welcome screen pour valider la chaîne

**Critère de validation :** une route `/welcome` qui affiche correctement les fonts, les couleurs, le `Frame`, et les 2 CTAs avec les bons gradients/glows.

### Phase 1 — Onboarding ⏸
7 écrans : Welcome, InviteCode, Handle, Email, CheckInbox, Login (Face ID), Loading.

### Phase 2 — Hubs principaux ⏸
- `BankHubD_Silver` (variante silver finale)
- `StealthHubD` (variante finale)
- `Profile` (default)
- `TabBar` fonctionnel (5 tabs) + `TopNav` (Bank/Stealth toggle)

### Phase 3 — Flows transactionnels ⏸
- Tx flow 5 écrans × 2 tones : SelectAsset, Recipient, Amount, Confirm (swipe-to-send), Success
- Shield, Unshield
- MooveScreenC (bridge), AddFunds × 2 tones

### Phase 4 — Détails & polish ⏸
- Card screen, TxDetail
- Grow / Invest portfolio
- Lock screen
- Micro-interactions Reanimated : swipe-to-send physics, transitions inter-écrans, feedback press, success check animé, halo gold pulsé

## 7. Conventions de code

- **TypeScript strict** déjà en place. Types de props explicites.
- **Composants** : function components + arrow ; props typées via `type Props = { ... }`.
- **Styling** : NativeWind par défaut. `style={}` réservé aux cas que Tailwind ne couvre pas (gradients composés, shadows multiples, transformations animées Reanimated).
- **Couleurs/tokens** : toujours via Tailwind classes ou `tokens.ts`, jamais en hex inline.
- **Pas de commentaires** sauf invariants non-évidents. Pas de docstrings sur les composants UI.
- **Naming** : `kebab-case` pour les routes (contrainte Expo Router), `PascalCase` pour les composants.
- **Pas d'index.ts barrel** sauf utilité réelle.
- **Mocks** : un fichier `mocks/` par feature, exporté via hooks `useMockBalances()`, `useMockTransactions()`, etc., pour faciliter le swap futur vers les vrais services.

## 8. Variants à implémenter (et celles ignorées)

| Section | Variant retenue | Variants ignorées (pour l'instant) |
|---|---|---|
| Bank Hub | `BankHubD_Silver` | `BankHubD`, `BankHubD_SilverSquare` |
| Stealth Hub | `StealthHubD` | `StealthHubE` (private), `StealthHubE_Public` |
| Profile | `ProfileScreen` (default) | `ProfileScreen_Silver` |
| Moove | `MooveScreenC` | `MooveScreenA`, `MooveScreenB` |
| Onboarding | toutes (uniques) | — |
| Tx flow | les 5 × 2 tones | — |

À redécider une fois la phase 2 livrée si la 2e variante d'un hub apporte de la valeur.

## 9. Open questions

- **Sansation `.ttf`** : à fournir par toi quand possible. Impact visuel modéré ; Manrope est très proche.
- **Logo `stealf.`** en `Cormorant Garamond italic gold` : OK pour rester typo-only ou tu veux un asset SVG dédié ?
- **Animations** précises (durées, easings) : la maquette utilise des transitions CSS basiques ; pour le côté "0 friction", on calibrera au moment de la phase 4 avec des timings Apple-style (ex : `withSpring({damping: 18, stiffness: 200})` pour le swipe).
- **Localisation** : tous les textes de la maquette sont en EN. On reste EN, ou on prévoit `i18n` (FR + EN) dès la phase 0 ? Important si à statuer tôt car ça structure les textes.

## 10. Suite

Une fois ce spec approuvé :
1. Le skill `writing-plans` est invoqué pour produire le plan d'implémentation détaillé de la **Phase 0** (un plan par phase, on n'écrit pas tout d'un coup).
2. Le plan contient des tâches atomiques exécutables une à une avec validation entre chacune.
3. Après Phase 0 livrée et acceptée, plan suivant pour Phase 1, etc.
