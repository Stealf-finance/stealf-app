import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansationBold } from '@/src/design-system/typography';
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
            // flex:1 lives on a plain View so each key reliably takes a third
            // of the row width; the Pressable fills it and centers the glyph.
            <View key={k} style={{ flex: 1 }}>
              <Pressable
                onPress={() => onKey(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Backspace' : k}
                style={({ pressed }) => ({
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
                      sansationBold,
                      {
                        fontSize: 32,
                        color: palette.ink,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {k}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
