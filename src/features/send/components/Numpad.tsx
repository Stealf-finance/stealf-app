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
    <View style={{ width: '100%', paddingHorizontal: 20 }}>
      {ROWS.map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            marginBottom: i < ROWS.length - 1 ? 8 : 0,
          }}
        >
          {row.map((k) => (
            // flex:1 on a static wrapper View → each key reliably takes an equal
            // third of the row width; the glyph is centred within it.
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
                  <Icons.backspace size={26} color={palette.ink} />
                ) : (
                  <Text
                    style={[
                      sansationBold,
                      {
                        fontSize: 28,
                        color: palette.ink,
                        textAlign: 'center',
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
