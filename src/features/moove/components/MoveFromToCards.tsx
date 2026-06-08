import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  fromLabel: string;
  fromBalance: string;
  toLabel: string;
  toBalance: string;
  /** Tap on the From card — opens the asset picker. */
  onPressFrom?: () => void;
  tone?: Tone;
};

const TAG = {
  fontSize: 9,
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  fontWeight: '700' as const,
};

/**
 * Move "From → To" pair — two fully-rounded cards sitting flush against each
 * other (glued, no overlap). The source card is accent-tinted, the
 * destination card is plain glass. Each shows a tag, account name and balance.
 */
export function MoveFromToCards({
  fromLabel,
  fromBalance,
  toLabel,
  toBalance,
  onPressFrom,
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
      }}
    >
      {/* From (source) — accent tinted, tappable to pick the asset */}
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={onPressFrom}
          disabled={!onPressFrom}
          accessibilityRole={onPressFrom ? 'button' : undefined}
          accessibilityLabel={onPressFrom ? 'Change asset' : undefined}
          style={({ pressed }) => ({ opacity: pressed && onPressFrom ? 0.9 : 1 })}
        >
          <View
            style={{
              borderRadius: 18,
              padding: 14,
              backgroundColor: palette.accentSoft,
              borderWidth: 1,
              borderColor: palette.accentDim,
            }}
          >
            <Text style={[sansation, { ...TAG, color: palette.accent }]}>
              From
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: 10,
              }}
            >
              <Text
                style={[
                  sansation,
                  { fontSize: 14, fontWeight: '600', color: T.ink, includeFontPadding: false },
                ]}
                numberOfLines={2}
              >
                {fromLabel}
              </Text>
              {onPressFrom ? (
                <Icons.chevD size={12} color={T.inkFaint} strokeWidth={2} />
              ) : null}
            </View>
            <Text
              style={[
                sansation,
                { fontSize: 13, color: T.inkDim, marginTop: 3, includeFontPadding: false },
              ]}
              numberOfLines={1}
            >
              {fromBalance}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* To (destination) — plain glass, flush against the From card */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            borderRadius: 18,
            padding: 14,
            backgroundColor: T.bgRaised,
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Text style={[sansation, { ...TAG, color: T.inkFaint }]}>To</Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 14,
                fontWeight: '600',
                color: T.ink,
                marginTop: 10,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={2}
          >
            {toLabel}
          </Text>
          <Text
            style={[
              sansation,
              { fontSize: 13, color: T.inkDim, marginTop: 3, includeFontPadding: false },
            ]}
            numberOfLines={1}
          >
            {toBalance}
          </Text>
        </View>
      </View>
    </View>
  );
}
