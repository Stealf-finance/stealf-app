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
                {k === '⌫' ? (
                  // The backspace glyph is right-biased in its viewBox; nudge it
                  // left so it optically centres under the digit column.
                  <View style={{ transform: [{ translateX: -3 }] }}>
                    <Icons.backspace
                      size={30}
                      color={palette.ink}
                      strokeWidth={2}
                    />
                  </View>
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
