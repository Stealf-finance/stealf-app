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

// Disposition mirrors the design's "Send money · keypad": a 3-column grid with
// a wide column gap and tight row gap, transparent keys, bold centred glyphs.
export function Numpad({ onKey, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ width: '100%', paddingHorizontal: 20, rowGap: 4 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', columnGap: 30 }}>
          {row.map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <Pressable
                onPress={() => onKey(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Backspace' : k}
                style={({ pressed }) => ({
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                {k === '⌫' ? (
                  <Icons.backspace size={24} color={palette.ink} />
                ) : (
                  <Text
                    style={[
                      sansationBold,
                      {
                        fontSize: 26,
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
