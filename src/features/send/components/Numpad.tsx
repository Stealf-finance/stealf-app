import { Pressable, Text, View } from 'react-native';
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
    <View style={{ width: '100%', paddingHorizontal: 5 }}>
      {ROWS.map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            marginBottom: i < ROWS.length - 1 ? 30 : 0,
          }}
        >
          {row.map((k) => (
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
                {/* The delete key renders the chevron as a text glyph so it
                    lays out exactly like the digits (same centring/baseline). */}
                <Text
                  style={[
                    sansationBold,
                    {
                      fontSize: k === '⌫' ? 40 : 28,
                      color: palette.ink,
                      textAlign: 'center',
                      includeFontPadding: false,
                      // The "‹" glyph is left-biased in its advance box; nudge
                      // it right so it sits centred under the digit column.
                      ...(k === '⌫'
                        ? { transform: [{ translateX: 3 }] }
                        : null),
                    },
                  ]}
                >
                  {k === '⌫' ? '‹' : k}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
