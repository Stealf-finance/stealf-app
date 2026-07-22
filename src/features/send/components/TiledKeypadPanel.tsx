import { Pressable, Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  onKey: (k: string) => void;
  onPressCta: () => void;
  ctaLabel: string;
  ctaDisabled?: boolean;
  tone?: Tone;
};

const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

/**
 * Glass keypad panel — a rounded frosted card wrapping a 3×4 grid of
 * tiled keys and the primary CTA, matching the "Send money · tiles"
 * reference. The backspace key renders as the '❮' glyph (same choice as
 * the legacy Numpad) so it centres like the digits in the Sansation font.
 */
export function TiledKeypadPanel({
  onKey,
  onPressCta,
  ctaLabel,
  ctaDisabled = false,
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);
  return (
      <View
        style={{
          marginHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 18,
        }}
      >
        {/* Tile grid — rounding/flex live on static View wrappers because
            layout props set inside a Pressable style-function don't apply
            reliably on RN (keys would render as sharp rectangles). */}
        <View style={{ gap: 10, marginBottom: 14 }}>
          {ROWS.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((k) => (
                <View key={k} style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => onKey(k)}
                    accessibilityRole="button"
                    accessibilityLabel={k === '⌫' ? 'Backspace' : k}
                    style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                  >
                    <View
                      style={{
                        height: 64,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={[
                          sansationBold,
                          {
                            fontSize: 28,
                            color: palette.ink,
                            includeFontPadding: false,
                          },
                        ]}
                      >
                        {k === '⌫' ? '❮' : k}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Primary CTA — the shared design-system pill, so it matches the
            primary button used elsewhere in the flow (e.g. the recipient
            step's Continue). */}
        <PillBtn
          variant="primary"
          tone={tone}
          label={ctaLabel}
          onPress={onPressCta}
          disabled={ctaDisabled}
        />
      </View>
  );
}
