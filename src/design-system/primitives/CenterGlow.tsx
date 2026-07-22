import { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  children?: ReactNode;
  /**
   * Overall intensity of the centered haze. Default 1. Use 0.6 for subtler
   * presence, 1.3 for more drama.
   */
  intensity?: number;
  /**
   * Skip the radial haze and render a pure black shell. Used on menu/list
   * screens where the visual hierarchy comes entirely from glass surfaces.
   */
  flat?: boolean;
  /**
   * Render the pronounced silver top-to-black gradient. Opt-in — reserved for
   * the main screens (e.g. History); secondary/flow screens stay pure black.
   */
  topGlow?: boolean;
};

const GLOW: Record<Tone, string> = {
  silver: '#dcdce1',
  gold: '#d4af63',
};

// Radial fall-off in alpha space. Stops are normalised to [0,1] of the
// gradient radius. Peak at the centre, soft non-linear decay to fully
// transparent at the edge so the glow reaches the corners cleanly.
const STOPS: { offset: string; silver: number; gold: number }[] = [
  { offset: '0%', silver: 0.13, gold: 0.16 },
  { offset: '25%', silver: 0.085, gold: 0.105 },
  { offset: '50%', silver: 0.035, gold: 0.05 },
  { offset: '75%', silver: 0.01, gold: 0.015 },
  { offset: '100%', silver: 0, gold: 0 },
];

export function CenterGlow({
  tone = 'silver',
  intensity = 1,
  flat = false,
  topGlow = false,
  children,
}: Props) {
  const { width, height } = useWindowDimensions();
  const stopColor = GLOW[tone];
  const radius = Math.hypot(width, height) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Silver top glow (opt-in via topGlow) — FAB silver (#e8e8ea → #9a9a9f)
          fading to the pure-black bg. Only the main screens enable it. */}
      {topGlow ? (
        <LinearGradient
          colors={[
            'rgba(232,232,234,0.28)',
            'rgba(232,232,234,0.20)',
            'rgba(198,199,206,0.12)',
            'rgba(168,169,176,0.06)',
            'rgba(154,154,159,0.025)',
            'rgba(0,0,0,0)',
          ]}
          locations={[0, 0.08, 0.18, 0.28, 0.4, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {flat ? null : (
        <Svg
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient
              id="centerGlow"
              cx={width / 2}
              cy={height / 2}
              rx={radius}
              ry={radius}
              fx={width / 2}
              fy={height / 2}
              gradientUnits="userSpaceOnUse"
            >
              {STOPS.map((s, i) => {
                const opacity = (tone === 'gold' ? s.gold : s.silver) * intensity;
                return (
                  <Stop
                    key={i}
                    offset={s.offset}
                    stopColor={stopColor}
                    stopOpacity={opacity}
                  />
                );
              })}
            </RadialGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="url(#centerGlow)"
          />
        </Svg>
      )}
      {children}
    </View>
  );
}
