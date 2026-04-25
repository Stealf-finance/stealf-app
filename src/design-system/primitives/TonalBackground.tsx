import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  children?: ReactNode;
  /**
   * Overall intensity of the tonal haze. Default 1. Use 0.6 for subtler
   * presence (e.g. content-heavy screens), 1.3 for more drama (hero pages).
   */
  intensity?: number;
};

const GLOW: Record<Tone, string> = {
  silver: 'rgb(220,220,225)',
  gold: 'rgb(212,175,99)',
};

const tinted = (rgb: string, a: number) =>
  rgb.replace('rgb(', 'rgba(').replace(')', `,${a})`);

// Top-only halo: peak alpha at the top, smooth fall-off, then zero across
// the bottom half. Vertical gradient with non-linearly spaced stops so the
// fall-off reads as atmospheric lighting rather than a hard edge.
const STOPS_LOCATIONS = [0, 0.08, 0.18, 0.28, 0.4, 1];

const ALPHAS: Record<Tone, readonly number[]> = {
  silver: [0.18, 0.14, 0.08, 0.04, 0.018, 0],
  gold: [0.2, 0.16, 0.1, 0.05, 0.022, 0],
};

export function TonalBackground({
  tone = 'silver',
  intensity = 1,
  children,
}: Props) {
  const hue = GLOW[tone];
  const colors = ALPHAS[tone].map((a) => tinted(hue, a * intensity)) as [
    string,
    string,
    ...string[],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient
        colors={colors}
        locations={STOPS_LOCATIONS as [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
