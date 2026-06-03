import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansationLight } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  onKey: (k: string) => void;
  tone?: Tone;
};

const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function Numpad({ onKey, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ paddingHorizontal: 24 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {row.map((k) => (
            <Pressable
              key={k}
              onPress={() => onKey(k)}
              accessibilityRole="button"
              accessibilityLabel={k === '⌫' ? 'Backspace' : k}
              style={({ pressed }) => ({
                flex: 1,
                height: 58,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              {k === '⌫' ? (
                <Icons.backspace size={28} color={palette.ink} />
              ) : (
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 33,
                      color: palette.ink,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {k}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
