import { Pressable, Text, View } from 'react-native';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { Icons } from '@/src/design-system/icons';
import { splitUsd } from '../lib/formatUsd';

const FONT = { int: 76, dec: 32, dollar: 36 };
const SILVER = txPalette('silver');

type Props = {
  amountUSD: number;
  hidden: boolean;
  onToggleHidden: () => void;
};

/** Large centered total-balance block. Reuses the amount typography from the
 *  old BalanceCard (serif italic $, light integer, dimmed decimals). */
export function HomeTotal({ amountUSD, hidden, onToggleHidden }: Props) {
  const { int, dec } = splitUsd(amountUSD);
  return (
    <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 32 }}>
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
            sansationLight,
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

      <Pressable
        onPress={onToggleHidden}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
        hitSlop={10}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={[sansation, { fontSize: 13, letterSpacing: 0.2, color: SILVER.inkDim }]}>
          Total balance
        </Text>
        {hidden ? (
          <Icons.eyeOff size={16} color={SILVER.inkDim} />
        ) : (
          <Icons.eye size={16} color={SILVER.inkDim} />
        )}
      </Pressable>
    </View>
  );
}
