import { Pressable, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import type { InputMode } from './SourceAssetCard';

type Props = {
  iconSource: ImageSource | number;
  tokenLabel: string;
  /** Already-formatted big amount, e.g. "$6,324.49" (fiat) or "15" (asset). */
  primaryAmount: string;
  /** Small line under the amount, e.g. "15 SOL" or "$1,100.00". */
  secondaryAmount: string;
  inputMode: InputMode;
  onPressTokenPill?: () => void;
  onToggleMode?: () => void;
  toggleDisabled?: boolean;
};

// Fixed height for the amount row — sized for the largest figure (72) so
// the adaptive font scaling never changes the card's overall height.
const AMOUNT_BOX_HEIGHT = 84;

/**
 * Centered glass amount card — asset pill on top, large serif-italic
 * amount with a currency-swap affordance pinned right, and a secondary
 * line below. Mirrors the "Send money · tiles" reference layout.
 */
export function AmountCardTiles({
  iconSource,
  tokenLabel,
  primaryAmount,
  secondaryAmount,
  onPressTokenPill,
  onToggleMode,
  toggleDisabled = false,
}: Props) {
  // Split a leading "$" so it can render dimmer than the figure (matches
  // the reference's two-tone amount).
  const hasDollar = primaryAmount.startsWith('$');
  const amountBody = hasDollar ? primaryAmount.slice(1) : primaryAmount;

  // Shrink the figure as it grows so it never collides with the swap icon.
  // Base size matches the main balance screens (~76); steps down for longer
  // amounts so it stays on one line.
  const digits = amountBody.replace(/[^0-9]/g, '').length;
  const amountSize = digits >= 10 ? 48 : digits >= 8 ? 60 : 72;

  return (
    <View
      style={{
        marginHorizontal: 18,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: T.hairline,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.018)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          paddingTop: 18,
          paddingBottom: 20,
          paddingHorizontal: 18,
          alignItems: 'center',
        }}
      >
        {/* Asset selector pill */}
        <Pressable
          onPress={onPressTokenPill}
          disabled={!onPressTokenPill}
          accessibilityRole={onPressTokenPill ? 'button' : undefined}
          accessibilityLabel={
            onPressTokenPill ? `Select asset, currently ${tokenLabel}` : undefined
          }
          hitSlop={6}
          style={({ pressed }) => ({
            opacity: pressed && onPressTokenPill ? 0.85 : 1,
          })}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingLeft: 10,
              paddingRight: 18,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Image
              source={iconSource}
              contentFit="contain"
              cachePolicy="memory-disk"
              style={{ width: 28, height: 28, borderRadius: 14, marginRight: 10 }}
            />
            <Text
              style={[
                sansation,
                {
                  fontSize: 16,
                  color: T.ink,
                  fontWeight: '600',
                  includeFontPadding: false,
                },
              ]}
            >
              {tokenLabel}
            </Text>
            {onPressTokenPill ? (
              <View style={{ marginLeft: 8 }}>
                <Icons.chevD size={15} color={T.inkFaint} strokeWidth={2} />
              </View>
            ) : null}
          </View>
        </Pressable>

        {/* Amount — wrapped in a fixed-height box so the figure's font size
            (which steps down for longer amounts) never changes the card
            height. Figure uses sansationLight to match the main screens; the
            "$" stays serif italic like the home balance. */}
        <View
          style={{
            height: AMOUNT_BOX_HEIGHT,
            alignSelf: 'stretch',
            justifyContent: 'center',
            position: 'relative',
            marginTop: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'center',
            }}
          >
            {hasDollar ? (
              <Text
                style={[
                  serif,
                  {
                    fontStyle: 'italic',
                    fontSize: 38,
                    lineHeight: 38,
                    color: T.inkDim,
                    includeFontPadding: false,
                  },
                ]}
              >
                $
              </Text>
            ) : null}
            <Text
              style={[
                sansationLight,
                {
                  fontSize: amountSize,
                  lineHeight: amountSize,
                  color: T.ink,
                  letterSpacing: amountSize * -0.04,
                  includeFontPadding: false,
                },
              ]}
              numberOfLines={1}
            >
              {amountBody}
            </Text>
          </View>
          {onToggleMode ? (
            <Pressable
              onPress={onToggleMode}
              disabled={toggleDisabled}
              accessibilityRole="button"
              accessibilityLabel="Switch currency"
              hitSlop={8}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                opacity: toggleDisabled ? 0.4 : 1,
              }}
            >
              <Icons.swapV size={26} color={T.inkDim} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Secondary line */}
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: T.inkFaint,
              marginTop: 10,
              includeFontPadding: false,
            },
          ]}
        >
          {secondaryAmount}
        </Text>
      </LinearGradient>
    </View>
  );
}
