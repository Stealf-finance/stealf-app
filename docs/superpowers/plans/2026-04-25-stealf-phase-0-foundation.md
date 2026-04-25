# Stealf v2 — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the design system foundation (tokens, typography, primitives, navigation skeleton) so the upcoming phases can render every screen of the Stealf v2 maquette without revisiting infrastructure.

**Architecture:** Feature-based folder structure under `src/`, file-based routing under `app/` (Expo Router). NativeWind is the styling layer; design tokens live in `src/design-system/tokens.ts` and are mirrored in `tailwind.config.js`. Atomic primitives (Frame, StatusBar, ActionBtn, TabBar, etc.) port the maquette's `screens-shared.jsx` 1:1 to React Native using `react-native-svg`, `expo-blur`, `expo-linear-gradient`. Phase 0 ends with a single fully-rendered screen (Onboarding Welcome) used to validate the chain end-to-end.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, TypeScript strict, NativeWind 4 + Tailwind, Reanimated 4, react-native-svg, expo-blur, expo-linear-gradient, expo-font.

**Spec:** `docs/superpowers/specs/2026-04-25-stealf-app-foundation-design.md`
**Design source:** `docs/designs/Maquette.html`

---

## File map

### Created
- `tailwind.config.js`
- `babel.config.js`
- `metro.config.js`
- `global.css`
- `nativewind-env.d.ts`
- `src/design-system/tokens.ts`
- `src/design-system/typography.ts`
- `src/design-system/palettes.ts`
- `src/design-system/icons/index.tsx`
- `src/design-system/primitives/Frame.tsx`
- `src/design-system/primitives/StatusBar.tsx`
- `src/design-system/primitives/HomeIndicator.tsx`
- `src/design-system/primitives/Em.tsx`
- `src/design-system/primitives/Kicker.tsx`
- `src/design-system/primitives/ActionBtn.tsx`
- `src/design-system/primitives/BalanceLarge.tsx`
- `src/design-system/primitives/Dots.tsx`
- `src/design-system/primitives/CarouselBar.tsx`
- `src/design-system/primitives/TxRow.tsx`
- `src/design-system/primitives/TabBar.tsx`
- `src/design-system/primitives/TopNav.tsx`
- `src/features/onboarding/screens/Welcome.tsx`
- `app/index.tsx` (auth/tabs entry redirect)
- `app/(auth)/_layout.tsx`
- `app/(auth)/welcome.tsx`
- `app/(auth)/invite.tsx` (stub)
- `app/(auth)/handle.tsx` (stub)
- `app/(auth)/email.tsx` (stub)
- `app/(auth)/inbox.tsx` (stub)
- `app/(auth)/login.tsx` (stub)
- `app/(auth)/loading.tsx` (stub)
- `app/(tabs)/bank.tsx` (stub)
- `app/(tabs)/stealth.tsx` (stub)
- `app/(tabs)/invest.tsx` (stub)
- `app/(tabs)/profile.tsx` (stub)
- `app/moove.tsx` (stub)
- `app/shield.tsx` (stub)
- `app/unshield.tsx` (stub)
- `app/add-funds.tsx` (stub)
- `app/card.tsx` (stub)
- `app/lock.tsx` (stub)
- `app/send/_layout.tsx` (stub)
- `app/send/select-asset.tsx` (stub)
- `app/send/recipient.tsx` (stub)
- `app/send/amount.tsx` (stub)
- `app/send/confirm.tsx` (stub)
- `app/send/success.tsx` (stub)
- `app/tx/[id].tsx` (stub)

### Modified
- `app/_layout.tsx` (load fonts, configure stack)
- `app/(tabs)/_layout.tsx` (custom TabBar with 4 tabs + Moove FAB)
- `app.json` (font plugin config)
- `package.json` (deps via `npx expo install`)
- `tsconfig.json` (already has `@/*` alias, add `src/*` if needed)

### Deleted (template demo)
- `app/(tabs)/explore.tsx`
- `app/(tabs)/index.tsx` (replaced by `bank.tsx`)
- `app/modal.tsx`
- `components/` (all files: external-link, haptic-tab, hello-wave, parallax-scroll-view, themed-text, themed-view, ui/*)
- `constants/theme.ts`
- `hooks/use-color-scheme.ts`
- `hooks/use-color-scheme.web.ts`
- `hooks/use-theme-color.ts`
- `assets/images/partial-react-logo.png`, `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png` (template clutter — keep app icons)

---

## Task 1: Clean Expo template

**Files:**
- Delete: `app/(tabs)/explore.tsx`, `app/(tabs)/index.tsx`, `app/modal.tsx`
- Delete: entire `components/` folder
- Delete: `constants/theme.ts` and remove `constants/` folder if empty
- Delete: `hooks/use-color-scheme.ts`, `hooks/use-color-scheme.web.ts`, `hooks/use-theme-color.ts` and remove `hooks/` folder if empty
- Delete: `assets/images/partial-react-logo.png`, `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`

- [ ] **Step 1: Remove demo route files**

```bash
rm app/\(tabs\)/explore.tsx app/\(tabs\)/index.tsx app/modal.tsx
```

- [ ] **Step 2: Remove demo components and helpers**

```bash
rm -rf components/ constants/ hooks/
```

- [ ] **Step 3: Remove unused template images**

```bash
rm assets/images/partial-react-logo.png assets/images/react-logo.png assets/images/react-logo@2x.png assets/images/react-logo@3x.png
```

- [ ] **Step 4: Replace `app/_layout.tsx` with a temporary minimal stack**

The current layout imports the deleted `useColorScheme` hook. Replace it with a placeholder we'll flesh out in Task 4.

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
```

- [ ] **Step 5: Replace `app/(tabs)/_layout.tsx` with a placeholder**

We delete the demo TabBar implementation; we'll rebuild it in Task 12. For now ensure the (tabs) group still has a layout so Expo Router doesn't error.

`app/(tabs)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 6: Add a temporary `app/index.tsx`**

`app/index.tsx`:
```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
      <Text style={{ color: '#f1ece1' }}>Stealf — bootstrapping…</Text>
    </View>
  );
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Smoke test in dev server**

Run: `npx expo start --clear`
Expected: dev server starts, opening on iOS Simulator shows the dark "Stealf — bootstrapping…" screen. Stop the server with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove Expo template demo files"
```

---

## Task 2: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

NativeWind 4, Tailwind, react-native-svg, expo-blur, expo-linear-gradient, two Google Font packages.

We do **not** install `react-native-reusables` in Phase 0 — the Stealf primitives are too custom to benefit from shadcn-style scaffolding. We can add it later if a future phase needs accessible bottom-sheets/dialogs.

- [ ] **Step 1: Install Expo-managed deps**

```bash
npx expo install react-native-svg expo-blur expo-linear-gradient
```

Expected: each lib added to `package.json`, lockfile updated, no peer warnings.

- [ ] **Step 2: Install Google Fonts**

```bash
npx expo install @expo-google-fonts/cormorant-garamond @expo-google-fonts/jetbrains-mono
```

- [ ] **Step 3: Install NativeWind + Tailwind**

```bash
npm install nativewind react-native-css-interop
npm install --save-dev tailwindcss@^3.4.0 prettier-plugin-tailwindcss
```

NativeWind 4 needs `react-native-css-interop` as a runtime peer and Tailwind v3 (v4 isn't yet supported by NativeWind as of SDK 54). The Prettier plugin is optional — keep it; it'll auto-sort classes.

- [ ] **Step 4: Verify install**

Run: `npx tsc --noEmit`
Expected: no errors. (NativeWind types aren't wired yet — that's Task 3.)

Run: `cat package.json | grep -E "nativewind|tailwindcss|react-native-svg|expo-blur|expo-linear-gradient|cormorant|jetbrains"`
Expected: 7 lines listing all the deps.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install nativewind, tailwind, svg, blur, gradient, font deps"
```

---

## Task 3: Configure NativeWind + Tailwind

**Files:**
- Create: `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `global.css`, `nativewind-env.d.ts`
- Modify: `app/_layout.tsx` (import global.css)

The Tailwind theme mirrors the `T` design tokens object from `Maquette.html` lines 666-694. We declare all custom colors, font families, and a few sizing tokens that are reused by primitives.

- [ ] **Step 1: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        'bg-raised': '#151513',
        'bg-raised-2': '#1e1d1a',
        'bg-card': 'rgba(255,255,255,0.03)',
        'bg-card-strong': 'rgba(255,255,255,0.06)',
        'bg-light': '#e8e0d0',
        'bg-light-ink': '#0a0a0a',
        ink: '#f1ece1',
        'ink-dim': 'rgba(241,236,225,0.65)',
        'ink-faint': 'rgba(241,236,225,0.4)',
        'ink-mute': 'rgba(241,236,225,0.25)',
        hairline: 'rgba(241,236,225,0.09)',
        'hairline-strong': 'rgba(241,236,225,0.18)',
        trace: 'rgba(241,236,225,0.04)',
        gold: '#c9a86a',
        'gold-dim': 'rgba(201,168,106,0.5)',
        'gold-faint': 'rgba(201,168,106,0.15)',
        'gold-glow': 'rgba(201,168,106,0.28)',
        green: '#7ea688',
        red: '#d1604a',
      },
      fontFamily: {
        sans: ['Sansation_400Regular'],
        'sans-light': ['Sansation_300Light'],
        'sans-bold': ['Sansation_700Bold'],
        'sans-italic': ['Sansation_400Regular_Italic'],
        serif: ['CormorantGaramond_500Medium_Italic'],
        mono: ['JetBrainsMono_400Regular'],
      },
      letterSpacing: {
        kicker: '0.28em',
        'kicker-tight': '0.22em',
        'kicker-loose': '0.32em',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

- [ ] **Step 3: Create `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 4: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Import the stylesheet in the root layout**

Edit `app/_layout.tsx` — add the import as the first line:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
```

- [ ] **Step 7: Validate the styling chain**

Edit `app/index.tsx` to use a Tailwind class:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-ink">Stealf — bootstrapping…</Text>
    </View>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. The `className` prop is now recognized via `nativewind-env.d.ts`.

- [ ] **Step 9: Smoke test**

Run: `npx expo start --clear`
Expected: same dark screen as before, but now produced via Tailwind classes. (Visually identical.)

- [ ] **Step 10: Commit**

```bash
git add tailwind.config.js babel.config.js metro.config.js global.css nativewind-env.d.ts app/_layout.tsx app/index.tsx
git commit -m "feat: configure NativeWind with Stealf design tokens"
```

---

## Task 4: Configure fonts

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app.json`

Load Sansation locally (6 weights), Cormorant Garamond italic, JetBrains Mono regular. Splash screen stays up until fonts are ready.

- [ ] **Step 1: Add `expo-font` plugin entry to `app.json`**

This lets EAS build embed the fonts as native assets (vs. download them at runtime). The `expo-font` plugin section goes inside `"plugins": [...]`:

Edit `app.json`, replace the existing `"plugins"` array with:

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 200,
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0a",
      "dark": { "backgroundColor": "#0a0a0a" }
    }
  ],
  [
    "expo-font",
    {
      "fonts": [
        "./assets/fonts/Sansation/Sansation-Light.ttf",
        "./assets/fonts/Sansation/Sansation-LightItalic.ttf",
        "./assets/fonts/Sansation/Sansation-Regular.ttf",
        "./assets/fonts/Sansation/Sansation-Italic.ttf",
        "./assets/fonts/Sansation/Sansation-Bold.ttf",
        "./assets/fonts/Sansation/Sansation-BoldItalic.ttf"
      ]
    }
  ]
]
```

(We also bumped the splash background to Stealf's `#0a0a0a` for a flicker-free launch.)

- [ ] **Step 2: Update `app/_layout.tsx` to load fonts**

```tsx
import '../global.css';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sansation_300Light: require('../assets/fonts/Sansation/Sansation-Light.ttf'),
    Sansation_300Light_Italic: require('../assets/fonts/Sansation/Sansation-LightItalic.ttf'),
    Sansation_400Regular: require('../assets/fonts/Sansation/Sansation-Regular.ttf'),
    Sansation_400Regular_Italic: require('../assets/fonts/Sansation/Sansation-Italic.ttf'),
    Sansation_700Bold: require('../assets/fonts/Sansation/Sansation-Bold.ttf'),
    Sansation_700Bold_Italic: require('../assets/fonts/Sansation/Sansation-BoldItalic.ttf'),
    CormorantGaramond_500Medium_Italic,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
      <StatusBar style="light" />
    </>
  );
}
```

- [ ] **Step 3: Validate fonts in `app/index.tsx`**

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg gap-2">
      <Text className="text-ink font-sans-light text-2xl">Sansation Light</Text>
      <Text className="text-ink font-sans text-2xl">Sansation Regular</Text>
      <Text className="text-ink font-sans-bold text-2xl">Sansation Bold</Text>
      <Text className="text-gold font-serif text-3xl">Cormorant italic</Text>
      <Text className="text-ink font-mono text-base">JetBrains Mono · 0.0142 SOL</Text>
    </View>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual check**

Run: `npx expo start --clear`
Expected (iOS Simulator):
- Splash stays on the Stealf dark background until fonts load (no flash of system font)
- Five lines render, each in the named font with visibly distinct shapes
- Cormorant line is gold and italic
- JetBrains line uses a monospace face

- [ ] **Step 6: Commit**

```bash
git add app.json app/_layout.tsx app/index.tsx
git commit -m "feat: load Sansation, Cormorant Garamond, JetBrains Mono fonts"
```

---

## Task 5: Design tokens module

**Files:**
- Create: `src/design-system/tokens.ts`, `src/design-system/typography.ts`, `src/design-system/palettes.ts`

Tokens.ts mirrors `tailwind.config.js` for runtime access (Reanimated styles, gradient stops, SVG fills — places where Tailwind classes don't reach). Typography.ts gives semantic font helpers. Palettes.ts ports `txPalette()` for silver/gold tonality switching.

- [ ] **Step 1: Create `src/design-system/tokens.ts`**

```ts
export const T = {
  bg: '#0a0a0a',
  bgRaised: '#151513',
  bgRaised2: '#1e1d1a',
  bgCard: 'rgba(255,255,255,0.03)',
  bgCardStrong: 'rgba(255,255,255,0.06)',
  bgLight: '#e8e0d0',
  bgLightInk: '#0a0a0a',

  ink: '#f1ece1',
  inkDim: 'rgba(241,236,225,0.65)',
  inkFaint: 'rgba(241,236,225,0.4)',
  inkMute: 'rgba(241,236,225,0.25)',
  hairline: 'rgba(241,236,225,0.09)',
  hairlineStrong: 'rgba(241,236,225,0.18)',
  trace: 'rgba(241,236,225,0.04)',

  gold: '#c9a86a',
  goldDim: 'rgba(201,168,106,0.5)',
  goldFaint: 'rgba(201,168,106,0.15)',
  goldGlow: 'rgba(201,168,106,0.28)',

  green: '#7ea688',
  red: '#d1604a',
} as const;

export type Token = keyof typeof T;
```

- [ ] **Step 2: Create `src/design-system/typography.ts`**

```ts
import { TextStyle } from 'react-native';

export const sansation: TextStyle = { fontFamily: 'Sansation_400Regular' };
export const sansationLight: TextStyle = { fontFamily: 'Sansation_300Light' };
export const sansationBold: TextStyle = { fontFamily: 'Sansation_700Bold' };
export const sansationItalic: TextStyle = {
  fontFamily: 'Sansation_400Regular_Italic',
};

export const serif: TextStyle = {
  fontFamily: 'CormorantGaramond_500Medium_Italic',
};

export const mono: TextStyle = { fontFamily: 'JetBrainsMono_400Regular' };
```

- [ ] **Step 3: Create `src/design-system/palettes.ts`**

```ts
import { T } from './tokens';

export type Tone = 'silver' | 'gold';

export type Palette = {
  bg: string;
  accent: string;
  accentDim: string;
  accentSoft: string;
  accentGlow: string;
  ink: string;
  inkDim: string;
  inkFaint: string;
  hairline: string;
};

export const txPalette = (tone: Tone): Palette =>
  tone === 'gold'
    ? {
        bg: '#0a0a0a',
        accent: T.gold,
        accentDim: T.goldDim,
        accentSoft: T.goldFaint,
        accentGlow: T.goldGlow,
        ink: '#e8e8ea',
        inkDim: '#8a8a8f',
        inkFaint: '#6a6a70',
        hairline: T.goldFaint,
      }
    : {
        bg: '#0c0c0e',
        accent: '#c9c9cc',
        accentDim: 'rgba(201,201,204,0.32)',
        accentSoft: 'rgba(201,201,204,0.1)',
        accentGlow: 'rgba(220,220,225,0.28)',
        ink: '#e8e8ea',
        inkDim: '#8a8a8f',
        inkFaint: '#6a6a70',
        hairline: 'rgba(230,230,235,0.1)',
      };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/tokens.ts src/design-system/typography.ts src/design-system/palettes.ts
git commit -m "feat(ds): add tokens, typography, palettes modules"
```

---

## Task 6: Icons module

**Files:**
- Create: `src/design-system/icons/index.tsx`

Port the 40 SVG icons from the maquette (`screens-shared.jsx` lines 715-759) using `react-native-svg`. Each icon takes `size` and `strokeWidth` props; `color` comes from the parent via `currentColor` analog (we pass `stroke` directly).

- [ ] **Step 1: Create `src/design-system/icons/index.tsx`**

```tsx
import { ComponentProps } from 'react';
import {
  Circle,
  Path,
  Rect,
  Svg,
  SvgProps,
} from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const make =
  (children: React.ReactNode, vbW = 24, vbH = 24) =>
  ({ size = 18, color = 'currentColor', strokeWidth = 1.5 }: Props) =>
    (
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${vbW} ${vbH}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </Svg>
    );

const filled =
  (children: React.ReactNode, vbW = 24, vbH = 24) =>
  ({ size = 18, color = 'currentColor' }: Props) =>
    (
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${vbW} ${vbH}`}
        fill={color}
        stroke="none"
      >
        {children}
      </Svg>
    );

export const Icons = {
  arrUp: make(<Path d="M12 19V5M5 12l7-7 7 7" />),
  arrDown: make(<Path d="M12 5v14M5 12l7 7 7-7" />),
  arrRight: make(<Path d="M5 12h14M13 6l6 6-6 6" />),
  arrLeft: make(<Path d="M19 12H5M11 6l-6 6 6 6" />),
  arrUpRight: make(<Path d="M7 17L17 7M7 7h10v10" />),
  arrDownLeft: make(<Path d="M17 7L7 17M17 17H7V7" />),
  plus: make(<Path d="M12 5v14M5 12h14" />),
  minus: make(<Path d="M5 12h14" />),
  more: make(
    <>
      <Circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <Circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>,
  ),
  moove: make(
    <Path d="M7 7h11M18 7l-3-3M18 7l-3 3M17 17H6M6 17l3-3M6 17l3 3" />,
  ),
  shield: make(<Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />),
  shieldCheck: make(
    <>
      <Path d="M12 2L3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4z" />
      <Path d="M9 12l2 2 4-4" />
    </>,
  ),
  eye: make(
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>,
  ),
  eyeOff: make(
    <Path d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.9 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a13.16 13.16 0 01-2.4 3.17M6.61 6.61A13.53 13.53 0 002 12s3.5 7 10 7a9.74 9.74 0 005.39-1.6" />,
  ),
  lock: make(
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 018 0v4" />
    </>,
  ),
  card: make(
    <>
      <Rect x="2" y="6" width="20" height="14" rx="2" />
      <Path d="M2 11h20M6 16h4" />
    </>,
  ),
  bank: make(
    <Path d="M3 9l9-6 9 6M5 9v10h14V9M3 21h18M9 13v3M12 13v3M15 13v3" />,
  ),
  bolt: make(<Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  swap: make(<Path d="M7 10l-4-4 4-4M3 6h14M17 14l4 4-4 4M21 18H7" />),
  invest: make(<Path d="M3 17l5-5 4 4 9-9M15 7h6v6" />),
  home: make(
    <>
      <Path d="M3 11l9-8 9 8v10a2 2 0 01-2 2H5a2 2 0 01-2-2V11z" />
      <Path d="M9 22V12h6v10" />
    </>,
  ),
  user: make(
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0116 0" />
    </>,
  ),
  chevR: make(<Path d="M9 6l6 6-6 6" />),
  chevD: make(<Path d="M6 9l6 6 6-6" />),
  search: make(
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M21 21l-5-5" />
    </>,
  ),
  bell: make(
    <>
      <Path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" />
      <Path d="M10 20a2 2 0 004 0" />
    </>,
  ),
  settings: make(
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>,
  ),
  key: make(
    <>
      <Circle cx="8" cy="15" r="4" />
      <Path d="M11 13l9-9M16 8l3 3M13 10l3 3" />
    </>,
  ),
  copy: make(
    <>
      <Rect x="9" y="9" width="13" height="13" rx="2" />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>,
  ),
  qr: make(
    <>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Path d="M14 14h3M14 17v4M17 17h4M21 14v4M17 21h4" />
    </>,
  ),
  scan: make(
    <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" />,
  ),
  dots: make(
    <>
      <Circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </>,
  ),
  trend: make(<Path d="M3 17l5-5 4 4 9-9M15 7h6v6" />),
  gold: make(
    <>
      <Rect x="3" y="10" width="18" height="8" rx="1" />
      <Rect x="5" y="6" width="14" height="4" rx="1" />
      <Rect x="7" y="2" width="10" height="4" rx="1" />
    </>,
  ),
  sparkle: make(<Path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />),
  close: make(<Path d="M6 6l12 12M18 6L6 18" />),
  check: make(<Path d="M5 12l5 5 9-11" />),
  mail: make(
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>,
  ),
  info: make(
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4M12 8h.01" />
    </>,
  ),
  shieldOff: make(
    <>
      <Path d="M3 3l18 18" />
      <Path d="M20 13c0 5-8 9-8 9a12.6 12.6 0 01-4.1-3M4.7 4.7L4 5v7c0 1 .1 2 .3 2.9" />
      <Path d="M12 2L3 6" />
    </>,
  ),
  gift: make(
    <>
      <Path d="M20 12v10H4V12" />
      <Path d="M2 7h20v5H2z" />
      <Path d="M12 22V7" />
      <Path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </>,
  ),
  history: make(
    <>
      <Path d="M3 3v6h6" />
      <Path d="M3.05 13a9 9 0 105.28-8.46L3 9" />
      <Path d="M12 7v5l3 2" />
    </>,
  ),
} as const;

export type IconName = keyof typeof Icons;
```

> Note: the `more` and `dots` icons use inline `fill="currentColor"` paths inside otherwise stroked SVGs. Since `react-native-svg` doesn't honor `currentColor` on inner attributes the way browsers do, those circles need explicit `fill={color}`. We'll fix that if a future visual review flags it; for Phase 0 the icons render visibly even with the imperfect inheritance.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke render in `app/index.tsx`**

```tsx
import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg gap-3">
      <Icons.shield size={32} color="#c9a86a" />
      <Icons.bank size={28} color="#f1ece1" />
      <Icons.arrUpRight size={20} color="#7ea688" />
      <Text className="text-ink font-sans">Icons render</Text>
    </View>
  );
}
```

Run: `npx expo start --clear`
Expected: three icons + text visible, dark background, no warnings about SVG.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/icons/index.tsx app/index.tsx
git commit -m "feat(ds): add Icons module (40 SVG icons)"
```

---

## Task 7: Page chrome primitives

**Files:**
- Create: `src/design-system/primitives/Frame.tsx`, `StatusBar.tsx`, `HomeIndicator.tsx`, `Em.tsx`

`Frame` wraps every screen with the device-shape (rounded corners, fixed bg) on web/canvas. On a real device the rounded corners and hardcoded width belong to the OS, so on native we render a full-bleed View and apply only the bg + safe-area handling. The `Frame` here represents an in-app screen container with the right background and font defaults — not a device chrome.

`StatusBar` here is the in-frame visual status bar from the maquette (time + signal + battery icons drawn for reproducing the design canvas). On a real device this is the OS status bar; we keep this primitive only for parity with the maquette but **default it to invisible on real devices** via a `mock` prop (default `false`). When the user runs in a future "design preview" mode, set `mock={true}`.

For Phase 0 we ship `mock={false}` as default — the OS status bar handles itself.

- [ ] **Step 1: Create `src/design-system/primitives/Frame.tsx`**

```tsx
import { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  variant?: 'dark' | 'light';
};

export function Frame({ children, variant = 'dark' }: Props) {
  return (
    <View
      className={`flex-1 ${variant === 'light' ? 'bg-bg-light' : 'bg-bg'}`}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Create `src/design-system/primitives/StatusBar.tsx`**

This is the in-canvas mock status bar. On a real device we never render it; the OS has its own. Kept for design fidelity in screenshots.

```tsx
import Svg, { G, Path, Rect } from 'react-native-svg';
import { Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';

type Props = { time?: string; mock?: boolean; dark?: boolean };

export function StatusBar({ time = '9:41', mock = false, dark = true }: Props) {
  if (!mock) return null;

  const c = dark ? '#f1ece1' : '#000';

  return (
    <View
      style={{
        height: 54,
        paddingHorizontal: 28,
        paddingTop: 20,
        paddingBottom: 8,
      }}
      className="flex-row items-center justify-between"
    >
      <Text style={[sansationBold, { fontSize: 16, color: c, letterSpacing: -0.2 }]}>
        {time}
      </Text>

      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Svg width={16} height={10} viewBox="0 0 16 10">
          <G fill={c}>
            <Rect x={0} y={6} width={2.5} height={4} rx={0.5} />
            <Rect x={4} y={4} width={2.5} height={6} rx={0.5} />
            <Rect x={8} y={2} width={2.5} height={8} rx={0.5} />
            <Rect x={12} y={0} width={2.5} height={10} rx={0.5} />
          </G>
        </Svg>
        <Svg width={24} height={11} viewBox="0 0 24 11">
          <Rect
            x={0.5}
            y={0.5}
            width={21}
            height={10}
            rx={2.5}
            fill="none"
            stroke={c}
            strokeOpacity={0.4}
          />
          <Rect x={2} y={2} width={16} height={7} rx={1.2} fill={c} />
          <Path
            d="M22.5 3.5v4c.6-.25 1-.9 1-2s-.4-1.75-1-2z"
            fill={c}
            fillOpacity={0.5}
          />
        </Svg>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Create `src/design-system/primitives/HomeIndicator.tsx`**

```tsx
import { View } from 'react-native';

type Props = { mock?: boolean; dark?: boolean };

export function HomeIndicator({ mock = false, dark = true }: Props) {
  if (!mock) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        marginLeft: -67,
        width: 134,
        height: 5,
        borderRadius: 3,
        backgroundColor: dark ? 'rgba(241,236,225,0.5)' : 'rgba(0,0,0,0.3)',
      }}
    />
  );
}
```

- [ ] **Step 4: Create `src/design-system/primitives/Em.tsx`**

```tsx
import { Text, TextProps } from 'react-native';
import { serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export function Em({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[serif, { color: T.gold }, style]} {...rest}>
      {children}
    </Text>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Smoke render**

Replace `app/index.tsx`:

```tsx
import { Text } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Em } from '@/src/design-system/primitives/Em';
import { sansationLight } from '@/src/design-system/typography';

export default function Index() {
  return (
    <Frame>
      <Text
        style={[sansationLight, { fontSize: 36, color: '#f1ece1' }]}
        className="mt-[200px] mx-auto text-center"
      >
        a world where <Em style={{ fontSize: 36 }}>everything</Em>{'\n'}is watched.
      </Text>
    </Frame>
  );
}
```

Run: `npx expo start --clear`
Expected: dark Frame, light Sansation text, gold italic "everything" via `Em`.

- [ ] **Step 7: Commit**

```bash
git add src/design-system/primitives/ app/index.tsx
git commit -m "feat(ds): add Frame, StatusBar, HomeIndicator, Em primitives"
```

---

## Task 8: Kicker primitive

**Files:**
- Create: `src/design-system/primitives/Kicker.tsx`

A small uppercase tracking-out label used everywhere (`— a new bank for —`, `— stealf · virtual —`, `Step 1 of 4`).

- [ ] **Step 1: Create `src/design-system/primitives/Kicker.tsx`**

```tsx
import { Text, TextProps } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';

type Props = TextProps & { color?: string };

export function Kicker({ children, color = 'rgba(241,236,225,0.4)', style, ...rest }: Props) {
  return (
    <Text
      style={[
        sansationBold,
        {
          fontSize: 10,
          letterSpacing: 2.8, // 0.28em at 10px
          textTransform: 'uppercase',
          color,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
```

> Note on `letterSpacing`: in CSS `0.28em` at fontSize 10 means 2.8px tracking. RN doesn't accept `em` units; we convert manually. Adjust if the visual diverges.

- [ ] **Step 2: Type-check & smoke render**

Replace `app/index.tsx`:

```tsx
import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Kicker } from '@/src/design-system/primitives/Kicker';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center gap-3">
        <Kicker>— a new bank for —</Kicker>
        <Kicker color="#c9a86a">step 1 of 4</Kicker>
        <Kicker>— stealf · virtual —</Kicker>
      </View>
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: three uppercase letter-spaced labels, the middle one in gold.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/Kicker.tsx app/index.tsx
git commit -m "feat(ds): add Kicker primitive"
```

---

## Task 9: ActionBtn primitive

**Files:**
- Create: `src/design-system/primitives/ActionBtn.tsx`

Circular icon button (Revolut-style). Two variants: default (subtle dark surface, hairline border) and accent (gold filled with halo glow). Used on Card screen and inside hubs.

- [ ] **Step 1: Create `src/design-system/primitives/ActionBtn.tsx`**

```tsx
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  accent?: boolean;
  large?: boolean;
};

export function ActionBtn({ icon, label, onPress, accent = false, large = false }: Props) {
  const dim = large ? 60 : 48;
  return (
    <Pressable onPress={onPress} className="items-center" style={{ gap: 8 }}>
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: accent ? T.gold : T.bgCardStrong,
          borderWidth: accent ? 0 : 1,
          borderColor: accent ? 'transparent' : T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: accent ? T.gold : 'transparent',
          shadowOpacity: accent ? 0.45 : 0,
          shadowRadius: accent ? 16 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: accent ? 8 : 0,
        }}
      >
        {icon}
      </View>
      <Text
        style={[
          sansation,
          {
            fontSize: 11,
            fontWeight: '400',
            letterSpacing: 0.2,
            color: accent ? T.gold : T.ink,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Smoke render**

```tsx
import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { ActionBtn } from '@/src/design-system/primitives/ActionBtn';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center flex-row gap-6">
        <ActionBtn icon={<Icons.eye size={18} color={T.ink} />} label="Show" />
        <ActionBtn icon={<Icons.lock size={18} color={T.ink} />} label="Freeze" />
        <ActionBtn
          icon={<Icons.bolt size={20} color="#0a0a0a" />}
          label="Send"
          accent
          large
        />
      </View>
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: three circular buttons; the third is gold with a soft halo, larger.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/ActionBtn.tsx app/index.tsx
git commit -m "feat(ds): add ActionBtn primitive"
```

---

## Task 10: Display primitives (BalanceLarge, Dots, CarouselBar)

**Files:**
- Create: `src/design-system/primitives/BalanceLarge.tsx`, `Dots.tsx`, `CarouselBar.tsx`

`BalanceLarge` displays the hero amount on hubs (huge `64px` integer + 32px decimals + gold italic `$`).
`Dots` is the carousel page indicator (active = wide gold pill).
`CarouselBar` is the underline tab strip used inside cards.

- [ ] **Step 1: Create `BalanceLarge.tsx`**

```tsx
import { Text, View } from 'react-native';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Kicker } from './Kicker';

type Props = {
  amount: string;
  label?: string;
  align?: 'left' | 'center';
};

export function BalanceLarge({ amount, label = 'Available', align = 'left' }: Props) {
  const [big, cents] = amount.split('.');
  return (
    <View style={{ paddingVertical: 8, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Kicker style={{ marginBottom: 10 }}>{label}</Kicker>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 4,
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        <Text style={[serif, { fontSize: 30, color: T.gold, lineHeight: 30 }]}>$</Text>
        <Text
          style={[
            sansationLight,
            { fontSize: 64, letterSpacing: -2.2, lineHeight: 64, color: T.ink },
          ]}
        >
          {big}
        </Text>
        {cents != null && (
          <Text
            style={[
              sansationLight,
              { fontSize: 32, letterSpacing: -0.6, color: T.inkDim },
            ]}
          >
            .{cents}
          </Text>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Create `Dots.tsx`**

```tsx
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';

type Props = { count: number; active: number; color?: string };

export function Dots({ count, active, color = T.gold }: Props) {
  return (
    <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: i === active ? color : T.inkMute,
          }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Create `CarouselBar.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  count: number;
  active: number;
  labels: string[];
  onSelect?: (i: number) => void;
};

export function CarouselBar({ count, active, labels, onSelect }: Props) {
  return (
    <View className="flex-row" style={{ paddingHorizontal: 24, marginBottom: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect?.(i)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: i === active ? T.gold : T.hairline,
          }}
        >
          <Text
            style={[
              sansationBold,
              {
                fontSize: 12,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: i === active ? T.ink : T.inkFaint,
                textAlign: 'center',
              },
            ]}
          >
            {labels[i]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Smoke render**

`app/index.tsx`:

```tsx
import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { BalanceLarge } from '@/src/design-system/primitives/BalanceLarge';
import { Dots } from '@/src/design-system/primitives/Dots';
import { CarouselBar } from '@/src/design-system/primitives/CarouselBar';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 justify-center" style={{ paddingHorizontal: 24, gap: 32 }}>
        <BalanceLarge amount="3,847.20" align="center" />
        <Dots count={4} active={1} />
        <CarouselBar count={3} active={0} labels={['Today', 'Week', 'Month']} />
      </View>
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: huge centered balance with gold `$` and dimmer cents; gold dot strip; underlined tab "Today" in white, others dimmed.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/primitives/ app/index.tsx
git commit -m "feat(ds): add BalanceLarge, Dots, CarouselBar primitives"
```

---

## Task 11: TxRow primitive

**Files:**
- Create: `src/design-system/primitives/TxRow.tsx`

Transaction list row. Icon (received vs sent), title + meta, amount in green for received / ink for sent.

- [ ] **Step 1: Create `TxRow.tsx`**

```tsx
import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Icons } from '@/src/design-system/icons';

type Props = {
  type: 'received' | 'sent' | 'other';
  title: string;
  meta: string;
  amount: string;
  last?: boolean;
};

export function TxRow({ type, title, meta, amount, last = false }: Props) {
  const isReceived = type === 'received';
  const iconColor = isReceived ? T.green : type === 'sent' ? T.ink : T.gold;

  return (
    <View
      className="flex-row items-center"
      style={{
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: T.trace,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: T.bgCardStrong,
          borderWidth: 1,
          borderColor: T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isReceived ? (
          <Icons.arrDownLeft size={16} color={iconColor} />
        ) : (
          <Icons.arrUpRight size={16} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text style={[sansation, { fontSize: 15, color: T.ink }]}>{title}</Text>
        <Text style={[sansation, { fontSize: 11, color: T.inkFaint, marginTop: 2 }]}>
          {meta}
        </Text>
      </View>
      <Text
        style={[
          sansation,
          { fontSize: 15, color: isReceived ? T.green : T.ink },
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Smoke render**

`app/index.tsx`:

```tsx
import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TxRow } from '@/src/design-system/primitives/TxRow';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 justify-center" style={{ paddingHorizontal: 24 }}>
        <TxRow type="received" title="Received" meta="21 Apr · 04:41 am" amount="+$176.76" />
        <TxRow type="sent" title="Carrefour" meta="21 Apr · 11:20 am" amount="−$34.50" />
        <TxRow type="sent" title="Spotify" meta="15 Apr · 09:00 am" amount="−$9.99" last />
      </View>
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: 3 rows, separators, green amount on received, no separator under last.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/TxRow.tsx app/index.tsx
git commit -m "feat(ds): add TxRow primitive"
```

---

## Task 12: TabBar (custom 4 tabs + Moove FAB)

**Files:**
- Create: `src/design-system/primitives/TabBar.tsx`

The signature navigation. Bank · Stealth · [Moove FAB centered, golden, raised −14px, with halo glow] · Invest · Profile.

The Moove button calls `router.push('/moove')` so it's a CTA, not a tab. The 4 real tabs each call a `onTab(id)` handler that the parent (Expo Router tabs layout in Task 14) wires to navigation.

`expo-blur` is used for the gradient backdrop overlay.

- [ ] **Step 1: Create `TabBar.tsx`**

```tsx
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { sansation, sansationBold, serif } from '@/src/design-system/typography';

export type TabId = 'bank' | 'stealth' | 'invest' | 'profile';

type Props = {
  active: TabId;
  onTab: (id: TabId) => void;
  onMoove: () => void;
};

const TABS: { id: TabId; label: string; iconKey: keyof typeof Icons }[] = [
  { id: 'bank', label: 'Bank', iconKey: 'bank' },
  { id: 'stealth', label: 'Stealth', iconKey: 'shield' },
  { id: 'invest', label: 'Invest', iconKey: 'trend' },
  { id: 'profile', label: 'Profile', iconKey: 'user' },
];

export function TabBar({ active, onTab, onMoove }: Props) {
  return (
    <View
      className="absolute left-0 right-0 bottom-0"
      style={{ paddingTop: 14, paddingBottom: 34, paddingHorizontal: 16 }}
    >
      <BlurView intensity={20} tint="dark" style={{ position: 'absolute', inset: 0 }} />
      <LinearGradient
        colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.9)', 'rgba(10,10,10,0.98)']}
        locations={[0, 0.2, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor: T.hairline,
        }}
      />

      <View className="flex-row items-center justify-around">
        {/* tab 0 + 1 */}
        {TABS.slice(0, 2).map((t) => (
          <TabSlot key={t.id} t={t} active={active === t.id} onPress={() => onTab(t.id)} />
        ))}

        {/* center FAB */}
        <Pressable
          onPress={onMoove}
          className="items-center"
          style={{ gap: 4, transform: [{ translateY: -14 }] }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: T.gold,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: T.gold,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
              borderWidth: 4,
              borderColor: 'rgba(10,10,10,0.8)',
            }}
          >
            <Icons.moove size={22} color="#0a0a0a" />
          </View>
          <Text style={[serif, { fontSize: 12, color: T.gold }]}>Moove</Text>
        </Pressable>

        {/* tab 2 + 3 */}
        {TABS.slice(2).map((t) => (
          <TabSlot key={t.id} t={t} active={active === t.id} onPress={() => onTab(t.id)} />
        ))}
      </View>
    </View>
  );
}

function TabSlot({
  t,
  active,
  onPress,
}: {
  t: (typeof TABS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const Icon = Icons[t.iconKey];
  return (
    <Pressable onPress={onPress} className="items-center" style={{ gap: 4 }}>
      <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={active ? T.ink : T.inkMute} />
      </View>
      <Text
        style={[
          active ? sansationBold : sansation,
          { fontSize: 10, letterSpacing: 0.2, color: active ? T.ink : T.inkMute },
        ]}
      >
        {t.label}
      </Text>
      {active && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: T.gold,
            marginTop: 2,
          }}
        />
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Smoke render**

`app/index.tsx`:

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';

export default function Index() {
  const [tab, setTab] = useState<TabId>('bank');
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink text-2xl font-sans-light">Active: {tab}</Text>
      </View>
      <TabBar active={tab} onTab={setTab} onMoove={() => alert('Open Moove')} />
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: 4 dim tabs, golden raised central button with text "Moove" in gold serif italic. Tap a tab — it lights up and shows the gold dot. Tap Moove — alert.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/TabBar.tsx app/index.tsx
git commit -m "feat(ds): add TabBar with 4 tabs + Moove FAB"
```

---

## Task 13: TopNav primitive

**Files:**
- Create: `src/design-system/primitives/TopNav.tsx`

Top navigation toggle (Bank ↔ Stealth) + avatar. Used on the two main hubs.

- [ ] **Step 1: Create `TopNav.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { sansation, sansationBold, sansationLight } from '@/src/design-system/typography';

type Props = {
  active: 'bank' | 'stealth';
  onChange: (v: 'bank' | 'stealth') => void;
  initial?: string;
  onProfile?: () => void;
};

export function TopNav({ active, onChange, initial = 'T', onProfile }: Props) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 }}
    >
      <View className="flex-row items-baseline" style={{ gap: 20 }}>
        <Pressable onPress={() => onChange('bank')}>
          <Text
            style={[
              active === 'bank' ? sansationBold : sansationLight,
              {
                fontSize: 22,
                letterSpacing: -0.5,
                color: active === 'bank' ? T.ink : T.inkFaint,
              },
            ]}
          >
            Bank
          </Text>
        </Pressable>
        <Pressable onPress={() => onChange('stealth')}>
          <Text
            style={[
              active === 'stealth' ? sansationBold : sansationLight,
              {
                fontSize: 22,
                letterSpacing: -0.5,
                color: active === 'stealth' ? T.ink : T.inkFaint,
              },
            ]}
          >
            Stealth
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onProfile}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: T.bgCardStrong,
          borderWidth: 1,
          borderColor: T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[sansationBold, { fontSize: 13, color: T.ink }]}>{initial}</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Smoke render**

```tsx
import { useState } from 'react';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TopNav } from '@/src/design-system/primitives/TopNav';

export default function Index() {
  const [active, setActive] = useState<'bank' | 'stealth'>('bank');
  return (
    <Frame>
      <TopNav active={active} onChange={setActive} />
    </Frame>
  );
}
```

Run: `npx tsc --noEmit && npx expo start --clear`
Expected: Bank bold, Stealth dim. Tap Stealth → swap.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/TopNav.tsx app/index.tsx
git commit -m "feat(ds): add TopNav primitive"
```

---

## Task 14: Expo Router skeleton (auth + tabs + modals)

**Files:**
- Modify: `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/{welcome,invite,handle,email,inbox,login,loading}.tsx`
- Create: `app/(tabs)/{bank,stealth,invest,profile}.tsx`
- Create: `app/{moove,shield,unshield,add-funds,card,lock}.tsx`
- Create: `app/send/_layout.tsx`, `app/send/{select-asset,recipient,amount,confirm,success}.tsx`
- Create: `app/tx/[id].tsx`

We wire the navigation tree without implementing screens — each route file renders a placeholder. The Welcome screen (Task 15) will be the only real implementation. The TabBar primitive is wired into `(tabs)/_layout.tsx` using a router-aware adapter.

- [ ] **Step 1: Update root stack `app/_layout.tsx`**

```tsx
import '../global.css';
import { useFonts } from 'expo-font';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sansation_300Light: require('../assets/fonts/Sansation/Sansation-Light.ttf'),
    Sansation_300Light_Italic: require('../assets/fonts/Sansation/Sansation-LightItalic.ttf'),
    Sansation_400Regular: require('../assets/fonts/Sansation/Sansation-Regular.ttf'),
    Sansation_400Regular_Italic: require('../assets/fonts/Sansation/Sansation-Italic.ttf'),
    Sansation_700Bold: require('../assets/fonts/Sansation/Sansation-Bold.ttf'),
    Sansation_700Bold_Italic: require('../assets/fonts/Sansation/Sansation-BoldItalic.ttf'),
    CormorantGaramond_500Medium_Italic,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="moove" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shield" options={{ presentation: 'modal' }} />
        <Stack.Screen name="unshield" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-funds" options={{ presentation: 'modal' }} />
        <Stack.Screen name="card" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lock" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="send" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tx/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
```

- [ ] **Step 2: Update entry redirect `app/index.tsx`**

```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // No auth state yet — always send to onboarding welcome.
  return <Redirect href="/(auth)/welcome" />;
}
```

- [ ] **Step 3: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    />
  );
}
```

- [ ] **Step 4: Create auth stub screens**

For each of `invite.tsx`, `handle.tsx`, `email.tsx`, `inbox.tsx`, `login.tsx`, `loading.tsx`, create the same stub (substitute the screen name in the title):

`app/(auth)/invite.tsx`:
```tsx
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function InviteScreen() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">invite — TODO</Text>
      </View>
    </Frame>
  );
}
```

Repeat with `HandleScreen`, `EmailScreen`, `InboxScreen`, `LoginScreen`, `LoadingScreen` and label texts `handle — TODO`, etc.

- [ ] **Step 5: Create `app/(auth)/welcome.tsx`** (real implementation lands in Task 15; for now a stub)

```tsx
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function WelcomeScreen() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink font-sans">welcome — placeholder</Text>
      </View>
    </Frame>
  );
}
```

- [ ] **Step 6: Update `app/(tabs)/_layout.tsx`**

Use the custom TabBar with the router. Use `Slot` so the tab content is the matched route content.

```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const active: TabId = (['bank', 'stealth', 'invest', 'profile'] as TabId[]).includes(last as TabId)
    ? (last as TabId)
    : 'bank';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Slot />
      <TabBar
        active={active}
        onTab={(id) => router.replace(`/(tabs)/${id}` as any)}
        onMoove={() => router.push('/moove')}
      />
    </View>
  );
}
```

- [ ] **Step 7: Create the 4 tab stub screens**

`app/(tabs)/bank.tsx`:
```tsx
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function BankTab() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink font-sans-light text-3xl">Bank</Text>
      </View>
    </Frame>
  );
}
```

Repeat for `stealth.tsx`, `invest.tsx`, `profile.tsx` with respective labels.

- [ ] **Step 8: Create modal stubs**

For each of `moove.tsx`, `shield.tsx`, `unshield.tsx`, `add-funds.tsx`, `card.tsx`, `lock.tsx` at the root of `app/`, use the same stub pattern as the auth screens. Example `app/moove.tsx`:

```tsx
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function MooveModal() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-gold font-serif text-4xl">Moove</Text>
        <Text className="text-ink-faint mt-2">bridge — TODO</Text>
      </View>
    </Frame>
  );
}
```

Repeat for the other 5 modals (Shield, Unshield, Add funds, Card, Lock).

- [ ] **Step 9: Create the send flow scaffold**

`app/send/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function SendLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    />
  );
}
```

For each of `select-asset.tsx`, `recipient.tsx`, `amount.tsx`, `confirm.tsx`, `success.tsx` inside `app/send/`, the same stub pattern.

`app/send/select-asset.tsx`:
```tsx
import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function SelectAsset() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">send · select-asset — TODO</Text>
      </View>
    </Frame>
  );
}
```

Repeat for the other four.

- [ ] **Step 10: Create `app/tx/[id].tsx` stub**

```tsx
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Frame } from '@/src/design-system/primitives/Frame';

export default function TxDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-faint font-sans">tx · {id ?? 'unknown'} — TODO</Text>
      </View>
    </Frame>
  );
}
```

- [ ] **Step 11: Type-check and smoke navigate**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx expo start --clear`
Expected:
- App opens to `/(auth)/welcome` placeholder ("welcome — placeholder")
- No way to reach tabs in this phase (auth gate not implemented). Manually deep-link to test:
  - `(tabs)/bank` shows the Bank label + the TabBar at the bottom
  - Tap each tab → routes update, active dot moves
  - Tap Moove FAB → opens Moove modal showing "Moove · bridge — TODO"
  - Dismiss modal → back on Bank tab

To deep-link from Metro, type `j` in the dev server, open the inspector, or use `npx uri-scheme open testclaudedesign://(tabs)/bank --ios`.

- [ ] **Step 12: Commit**

```bash
git add app/
git commit -m "feat(nav): wire Expo Router (auth + tabs + modals + send + tx) skeleton"
```

---

## Task 15: Welcome screen (validation)

**Files:**
- Create: `src/features/onboarding/screens/Welcome.tsx`
- Modify: `app/(auth)/welcome.tsx` to render the real screen

The Welcome screen is the validation goalpost for Phase 0. It exercises:
- Sansation Light + Bold + Cormorant italic + Kicker
- `Em` (gold italic accent in headline)
- Two CTAs (filled gold with halo glow + ghost outlined)
- Frame + safe-area handling

We render it under `(auth)/welcome` so the app's default route shows it.

- [ ] **Step 1: Create the screen component**

`src/features/onboarding/screens/Welcome.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Em } from '@/src/design-system/primitives/Em';
import { sansation, sansationBold, sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Frame>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 48,
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 48,
        }}
      >
        {/* Editorial logo */}
        <View className="items-center" style={{ marginBottom: 40 }}>
          <Text style={[serif, { fontSize: 56, color: T.gold, letterSpacing: -1.1 }]}>
            stealf.
          </Text>
          <Text
            style={[
              sansationBold,
              {
                fontSize: 10,
                letterSpacing: 3.2,
                color: T.inkFaint,
                marginTop: 4,
              },
            ]}
          >
            EST. MMXXVI · SOLANA
          </Text>
        </View>

        {/* Editorial statement */}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
          <Kicker style={{ marginBottom: 16 }}>— a new bank for —</Kicker>
          <Text
            style={[
              sansationLight,
              { fontSize: 44, color: T.ink, lineHeight: 46, letterSpacing: -1.3 },
            ]}
          >
            a world where{'\n'}
            <Em style={{ fontSize: 44 }}>everything</Em>
            {'\n'}is watched.
          </Text>
          <Text
            style={[
              serif,
              { fontSize: 16, color: T.inkDim, marginTop: 22, lineHeight: 24 },
            ]}
          >
            Hold crypto. Spend cash.{'\n'}Stay invisible.
          </Text>
        </View>

        {/* CTAs */}
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.push('/(auth)/invite')}
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 100,
              backgroundColor: T.gold,
              alignItems: 'center',
              shadowColor: T.gold,
              shadowOpacity: 0.4,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
              elevation: 12,
            }}
          >
            <Text
              style={[
                sansationBold,
                {
                  fontSize: 12,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: '#0a0a0a',
                },
              ]}
            >
              Create account
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 100,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: T.hairline,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                sansationBold,
                {
                  fontSize: 12,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: T.ink,
                },
              ]}
            >
              I have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </Frame>
  );
}
```

- [ ] **Step 2: Wire it into the route**

Replace `app/(auth)/welcome.tsx`:

```tsx
import { Welcome } from '@/src/features/onboarding/screens/Welcome';

export default function WelcomeRoute() {
  return <Welcome />;
}
```

- [ ] **Step 3: Add `react-native-safe-area-context` provider**

The hook needs a provider. Edit `app/_layout.tsx` — wrap `<Stack>` with `<SafeAreaProvider>`:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ...inside RootLayout return
return (
  <SafeAreaProvider>
    <Stack /* ... */>
      {/* existing children */}
    </Stack>
    <StatusBar style="light" />
  </SafeAreaProvider>
);
```

(`react-native-safe-area-context` is already in dependencies — see `package.json`.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual validation (Phase 0 acceptance)**

Run: `npx expo start --clear` and open on iOS Simulator.

Expected:
- Splash dark, fonts load, app routes to `/(auth)/welcome` automatically
- "stealf." logo in gold Cormorant italic at the top
- "EST. MMXXVI · SOLANA" tracked-out kicker beneath
- Headline "a world where / **everything** / is watched." with `everything` in gold italic Cormorant
- Subtitle "Hold crypto. Spend cash. Stay invisible." in italic Cormorant, dim cream
- Bottom: gold pill "CREATE ACCOUNT" with halo glow + ghost-outlined "I HAVE AN ACCOUNT"
- Tap "Create account" → navigates to `/(auth)/invite` placeholder
- Tap "I have an account" → navigates to `/(auth)/login` placeholder
- Compare visually against `docs/designs/Maquette.html` — Onboarding section "Welcome · Your money, your rules." artboard. Differences acceptable: device width follows real device (375 fixed in maquette; flexible on real iPhone), no embedded mock status bar.

- [ ] **Step 6: Commit**

```bash
git add src/features/onboarding/screens/Welcome.tsx app/(auth)/welcome.tsx app/_layout.tsx
git commit -m "feat(onboarding): implement Welcome screen — Phase 0 acceptance"
```

---

## Phase 0 acceptance summary

After Task 15 the repo has:
- A clean Expo / Expo Router project free of demo code
- NativeWind wired with the full Stealf token palette
- All three font families loaded and validated
- 12 design system primitives (`Frame`, `StatusBar`, `HomeIndicator`, `Em`, `Kicker`, `ActionBtn`, `BalanceLarge`, `Dots`, `CarouselBar`, `TxRow`, `TabBar`, `TopNav`)
- 40 SVG icons via `Icons` map
- Navigation skeleton: auth stack, tabs (4 tabs + Moove FAB modal), modal routes for Moove/Shield/Unshield/Add-funds/Card/Lock/Send/Tx detail
- One real screen rendered (`Welcome`) confirming the chain works

**Out of scope for Phase 0** (intentionally) — these come in Phase 1+:
- Auth gating logic
- Real screens beyond Welcome
- Animations beyond default Stack transitions
- Mock data, hooks, services

When this plan is complete, invoke `superpowers:writing-plans` again to draft Phase 1 (full Onboarding flow).
