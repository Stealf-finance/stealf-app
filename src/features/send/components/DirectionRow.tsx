import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  fromLabel: string;
  toLabel: string;
  tone?: Tone;
};

/**
 * Compact "From … → To …" card that anchors the user on the source and
 * destination of a value transfer. Used at the top of Move and Shield flows
 * (where the asset is moving between two named places, not just being sent).
 */
export function DirectionRow({ fromLabel, toLabel, tone = 'silver' }: Props) {
  const palette = txPalette(tone);

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.hairline,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: palette.inkFaint,
            },
          ]}
        >
          From
        </Text>
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: palette.ink,
              fontWeight: '500',
            },
          ]}
          numberOfLines={1}
        >
          {fromLabel}
        </Text>
        <View style={{ flex: 1 }} />
        <Icons.arrRight size={14} color={palette.accent} />
        <View style={{ flex: 1 }} />
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: palette.inkFaint,
            },
          ]}
        >
          To
        </Text>
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: palette.ink,
              fontWeight: '500',
            },
          ]}
          numberOfLines={1}
        >
          {toLabel}
        </Text>
      </LinearGradient>
    </View>
  );
}
