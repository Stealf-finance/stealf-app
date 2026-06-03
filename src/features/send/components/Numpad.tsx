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

// Left column hugs the left edge, middle centred, right column hugs the right
// edge — so the keypad spans the full width of the slide button / chips above.
const COL_ALIGN: ('flex-start' | 'center' | 'flex-end')[] = [
  'flex-start',
  'center',
  'flex-end',
];

export function Numpad({ onKey, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ width: '100%', paddingHorizontal: 24, gap: 10 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', width: '100%' }}>
          {row.map((k, col) => (
            // flex:1 cell = a third of the row (full touch target); the glyph is
            // aligned to the edge/centre via COL_ALIGN.
            <View key={k} style={{ flex: 1 }}>
              <Pressable
                onPress={() => onKey(k)}
                accessibilityRole="button"
                accessibilityLabel={k === '⌫' ? 'Backspace' : k}
                style={({ pressed }) => ({
                  height: 62,
                  alignItems: COL_ALIGN[col],
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
