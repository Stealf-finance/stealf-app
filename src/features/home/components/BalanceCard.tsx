import { Pressable, Text, View } from 'react-native';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Icons } from '@/src/design-system/icons';

// Large balance sizes, matching the Stealth hub.
const FONT = { int: 76, dec: 32, dollar: 36 };

type Props = {
  kicker: string;
  amountUSD: number;
  hidden: boolean;
  onToggleHidden: () => void;
  accent: string;
  ink: string;
  inkDim: string;
};

function splitUsd(usd: number): { int: string; dec: string } {
  const [int, dec = '00'] = Math.abs(usd).toFixed(2).split('.');
  return { int: `${usd < 0 ? '-' : ''}${Number(int).toLocaleString()}`, dec };
}

export function BalanceCard({
  kicker,
  amountUSD,
  hidden,
  onToggleHidden,
  accent,
  ink,
  inkDim,
}: Props) {
  const { int, dec } = splitUsd(amountUSD);
  return (
    <View>
      {/* Kicker + eye toggle, centered side by side (Stealth-hub layout). */}
      <View
        style={{
          paddingTop: 12,
          marginBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              letterSpacing: 3.2,
              textTransform: 'uppercase',
              color: ink,
              fontWeight: '700',
            },
          ]}
        >
          {kicker}
        </Text>
        <Pressable
          onPress={onToggleHidden}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
          hitSlop={10}
          style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
        >
          {hidden ? (
            <Icons.eyeOff size={22} color={ink} />
          ) : (
            <Icons.eye size={22} color={ink} />
          )}
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {hidden ? null : (
            <Text
              style={[
                serif,
                {
                  fontSize: FONT.dollar,
                  color: accent,
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
                color: ink,
                includeFontPadding: false,
              },
            ]}
          >
            {hidden ? '****' : int}
          </Text>
          {hidden ? null : (
            <Text
              style={[
                sansationLight,
                {
                  fontSize: FONT.dec,
                  color: inkDim,
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
      </View>
    </View>
  );
}
