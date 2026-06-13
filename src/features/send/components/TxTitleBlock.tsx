import { Text, View } from 'react-native';
import { sansationLight, serif } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  kicker: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
};

export function TxTitleBlock({
  kicker,
  title,
  subtitle,
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ paddingHorizontal: 28, marginBottom: 28 }}>
      <Kicker
        color={palette.accent}
        style={{
          letterSpacing: 3.2,
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        {kicker}
      </Kicker>
      <Text
        style={[
          sansationLight,
          {
            fontSize: 30,
            letterSpacing: -0.9,
            lineHeight: 33,
            color: palette.ink,
            textAlign: 'center',
            marginBottom: subtitle ? 8 : 0,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            serif,
            {
              fontSize: 15,
              fontStyle: 'italic',
              color: palette.accent,
              textAlign: 'center',
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
