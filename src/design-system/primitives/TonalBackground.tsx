import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  children?: ReactNode;
};

const GLOW: Record<Tone, string> = {
  silver: 'rgb(220,220,225)',
  gold: 'rgb(212,175,99)',
};

const tinted = (rgb: string, a: number) =>
  rgb.replace('rgb(', 'rgba(').replace(')', `,${a})`);

// Layered tonal background:
//   1. Solid `T.bg` base
//   2. Vertical "mist" — keeps the centre slightly tinted so halos never
//      meet a perceptible black wall; alpha is below the visual threshold
//      in isolation (~0.012) but kills the contrast edge on a dark display.
//   3. Two large radial halos (top + bottom) anchored off-screen so only
//      the soft tail of the gradient is visible; multi-stop curve for an
//      organic falloff.
export function TonalBackground({ tone = 'silver', children }: Props) {
  const hue = GLOW[tone];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient
        colors={[
          tinted(hue, 0.05),
          tinted(hue, 0.012),
          tinted(hue, 0.012),
          tinted(hue, 0.05),
        ]}
        locations={[0, 0.32, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Halo
        id={`bg-halo-top-${tone}`}
        anchor="top"
        offset={-180}
        height={460}
        hue={hue}
        peak={0.18}
      />
      <Halo
        id={`bg-halo-bottom-${tone}`}
        anchor="bottom"
        offset={-240}
        height={500}
        hue={hue}
        peak={0.14}
      />
      {children}
    </View>
  );
}

function Halo({
  id,
  anchor,
  offset,
  height,
  hue,
  peak,
}: {
  id: string;
  anchor: 'top' | 'bottom';
  offset: number;
  height: number;
  hue: string;
  peak: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        [anchor]: offset,
        left: 0,
        right: 0,
        height,
      }}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient
            id={id}
            cx="50%"
            cy="50%"
            rx="85%"
            ry="85%"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0" stopColor={hue} stopOpacity={peak} />
            <Stop offset="0.2" stopColor={hue} stopOpacity={peak * 0.78} />
            <Stop offset="0.4" stopColor={hue} stopOpacity={peak * 0.5} />
            <Stop offset="0.65" stopColor={hue} stopOpacity={peak * 0.2} />
            <Stop offset="1" stopColor={hue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
