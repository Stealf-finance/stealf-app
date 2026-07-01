import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  fromLabel: string;
  toLabel: string;
  tone?: Tone;
};

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
        <Kicker color={palette.inkFaint} style={{ fontSize: 9 }}>
          From
        </Kicker>
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
        <Kicker color={palette.inkFaint} style={{ fontSize: 9 }}>
          To
        </Kicker>
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
