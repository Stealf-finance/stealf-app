import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  iconKey?: keyof typeof Icons;
  /** Custom icon node — overrides `iconKey` (e.g. a multi-fill SVG glyph
   *  that doesn't fit the monochrome stroke-icon convention). */
  icon?: ReactNode;
  size?: number;
  iconSize?: number;
  hasDot?: boolean;
  onPress?: () => void;
  tone?: Tone;
  accessibilityLabel?: string;
};

const TINT_COLORS: [string, string] = [
  'rgba(20,20,22,0.32)',
  'rgba(8,8,10,0.42)',
];

export function CircleIconBtn({
  iconKey,
  icon,
  size = 44,
  iconSize = 18,
  hasDot,
  onPress,
  tone = 'silver',
  accessibilityLabel,
}: Props) {
  const palette = txPalette(tone);
  const Icon = iconKey ? Icons[iconKey] : null;
  const radius = size / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? iconKey ?? 'button'}
      hitSlop={6}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      {/* base: real frosted blur — picks up anything behind (gradients, glow) */}
      <BlurView
        intensity={28}
        tint="dark"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* light dark tint — keeps a hint of black without killing transparency */}
      <LinearGradient
        colors={TINT_COLORS}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon ?? (Icon ? <Icon size={iconSize} color={palette.ink} /> : null)}
      </View>

      {hasDot ? (
        <View
          style={{
            position: 'absolute',
            top: size * 0.22,
            right: size * 0.24,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: palette.accent,
            shadowColor: palette.accentGlow,
            shadowOpacity: 1,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ) : null}
    </Pressable>
  );
}
