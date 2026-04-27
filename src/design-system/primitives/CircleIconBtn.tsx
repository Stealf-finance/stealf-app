import { Pressable, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  iconKey: keyof typeof Icons;
  size?: number;
  iconSize?: number;
  hasDot?: boolean;
  onPress?: () => void;
  tone?: Tone;
  accessibilityLabel?: string;
};

export function CircleIconBtn({
  iconKey,
  size = 36,
  iconSize = 16,
  hasDot,
  onPress,
  tone = 'silver',
  accessibilityLabel,
}: Props) {
  const palette = txPalette(tone);
  const Icon = Icons[iconKey];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? iconKey}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.035)',
        borderWidth: 1,
        borderColor: palette.hairline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={iconSize} color={palette.ink} />
      {hasDot ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 9,
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
