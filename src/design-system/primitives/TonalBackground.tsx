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

// Bell-curve alpha distribution: strong peak at top + bottom, near-zero
// trough through the middle. Stops are non-linearly spaced for a smooth
// perceptual fall-off (denser stops where alpha changes fastest).
//
// Vertical-only gradient (no radial) so there is no inherent edge between
// the bloom and the middle: every pixel transitions linearly from its
// neighbour. The whole screen is a single continuous tint, and the eye
// reads it as "atmospheric lighting" rather than "two glowing patches on
// dark bg".
const STOPS_LOCATIONS = [0, 0.08, 0.18, 0.28, 0.4, 0.6, 0.72, 0.82, 0.92, 1];

const ALPHAS: Record<Tone, readonly number[]> = {
  silver: [0.18, 0.14, 0.08, 0.04, 0.018, 0.018, 0.04, 0.08, 0.12, 0.16],
  gold: [0.2, 0.16, 0.1, 0.05, 0.022, 0.022, 0.05, 0.1, 0.14, 0.18],
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
