import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
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

// Solid two-stop fill for the CTA pill, per tone. The design's "gold"
// button maps to the active tone's accent (silver for shield, gold for
// unshield), with a darker low stop for depth.
const CTA_GRADIENT: Record<Tone, [string, string]> = {
  gold: [T.gold, '#a37b2e'],
  silver: ['#d6d6d9', '#9a9a9e'],
};

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
        marginHorizontal: 12,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.015)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ padding: 16, paddingBottom: 18 }}
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
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Text
                        style={[
                          sansationBold,
                          {
                            fontSize: 22,
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

        {/* Primary CTA — filled accent pill, integrated into the panel.
            Rounding + clip on a static View (same Pressable-function caveat). */}
        <Pressable
          onPress={onPressCta}
          disabled={ctaDisabled}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => ({ opacity: ctaDisabled ? 0.4 : pressed ? 0.9 : 1 })}
        >
          <View style={{ borderRadius: 100, overflow: 'hidden' }}>
            <LinearGradient
              colors={CTA_GRADIENT[tone]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={[
                  sansationBold,
                  { fontSize: 15, color: '#0a0a0a', includeFontPadding: false },
                ]}
              >
                {ctaLabel}
              </Text>
            </LinearGradient>
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
