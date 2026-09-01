import { Pressable, Text, View } from 'react-native';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { Icons } from '@/src/design-system/icons';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { resolveValueState } from '@/src/lib/asyncValue';
import { splitUsd } from '../lib/formatUsd';

// Font sizes snap to the type scale: Hero 60 for the primary value, Title 28
// for the smaller currency symbol + decimals.
const FONT = { int: 60, dec: 28, dollar: 28 };
const SILVER = txPalette('silver');
// Balance hide/show eye is parked for now — flip to re-enable it inline with
// the "Total balance" label. The toggle wiring (hidden / onToggleHidden) is
// left intact so this is a one-line change.
const SHOW_EYE_TOGGLE: boolean = false;

type Props = {
  /** `undefined` until both balances are in — rendered as a skeleton rather
   *  than `$0`, which on a home screen reads as an empty account. */
  amountUSD: number | undefined;
  /** Both underlying queries failed with nothing cached. */
  error?: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
};

/** Large centered total-balance block: serif italic $, bold integer, dimmed
 *  decimals; the "Total balance" label + eye toggle sit inline underneath. */
export function HomeTotal({
  amountUSD,
  error = false,
  hidden,
  onToggleHidden,
}: Props) {
  const { int, dec } = splitUsd(amountUSD ?? 0);
  // Hiding wins over loading: the user asked for the figure to be covered, and
  // `****` covers an unknown amount just as well as a known one.
  const state = hidden ? 'value' : resolveValueState(amountUSD, error);

  return (
    <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 16 }}>
      {/* The wrapper holds the Hero-60 line height in every state so the
          sparkline and grid below don't shift when the figure lands. */}
      {state === 'value' ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {hidden ? null : (
            <Text
              style={[
                serif,
                {
                  fontSize: FONT.dollar,
                  color: SILVER.accent,
                  fontStyle: 'italic',
                  lineHeight: FONT.dollar,
                  includeFontPadding: false,
                },
              ]}
            >
              $
            </Text>
          )}
          <Text
            style={[
              sansation,
              {
                fontSize: FONT.int,
                letterSpacing: FONT.int * -0.04,
                lineHeight: FONT.int,
                color: SILVER.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {hidden ? '****' : int}
          </Text>
          {hidden ? null : (
            <Text
              style={[
                sansation,
                {
                  fontSize: FONT.dec,
                  color: SILVER.inkDim,
                  letterSpacing: FONT.dec * -0.02,
                  lineHeight: FONT.dec,
                  includeFontPadding: false,
                },
              ]}
            >
              {dec}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ height: FONT.int, justifyContent: 'center' }}>
          {state === 'error' ? (
            <Text
              style={[
                sansation,
                {
                  fontSize: FONT.int,
                  lineHeight: FONT.int,
                  letterSpacing: FONT.int * -0.04,
                  color: SILVER.inkFaint,
                  includeFontPadding: false,
                },
              ]}
            >
              &mdash;
            </Text>
          ) : (
            <Skeleton width={200} height={44} radius={12} />
          )}
        </View>
      )}

      <Pressable
        onPress={SHOW_EYE_TOGGLE ? onToggleHidden : undefined}
        disabled={!SHOW_EYE_TOGGLE}
        accessibilityRole={SHOW_EYE_TOGGLE ? 'button' : undefined}
        accessibilityLabel={
          SHOW_EYE_TOGGLE ? (hidden ? 'Show balance' : 'Hide balance') : undefined
        }
        hitSlop={10}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={[
            sansation,
            { fontSize: 14, lineHeight: 20, letterSpacing: 0.2, color: SILVER.inkDim },
          ]}
        >
          Total balance
        </Text>
        {SHOW_EYE_TOGGLE ? (
          hidden ? (
            <Icons.eyeOff size={16} color={SILVER.inkDim} />
          ) : (
            <Icons.eye size={16} color={SILVER.inkDim} />
          )
        ) : null}
      </Pressable>
    </View>
  );
}
