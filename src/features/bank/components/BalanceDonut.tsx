import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
import type { HomeBalances } from '@/src/features/home/lib/aggregateHomeBalances';
import { donutArcs } from '../lib/donutGeometry';

const SIZE = 180;
const STROKE = 14; // thin ring — épuré
const RADIUS = (SIZE - STROKE) / 2;

/** Ring + legend order. Colors validated (dataviz six-checks, dark surface):
 *  CVD ΔE 15.6 / normal 17.2 on the worst adjacent pair, all ≥3:1 contrast.
 *  Monochrome-plus-gold is a deliberate brand deviation from the chroma
 *  floor, backed by secondary encoding (segment gaps + dot/label legend). */
const SECTIONS = [
  { key: 'cash', label: 'Cash', color: '#e8e8ea' },
  { key: 'wallet', label: 'Wallet', color: '#82828c' },
  { key: 'encrypted', label: 'Encrypted Balance', color: T.gold },
  { key: 'earn', label: 'Earn', color: '#666670' },
] as const;

const EMPTY_STROKE = 'rgba(255,255,255,0.08)';

/** Minimal balance-split donut: thin ring, USD total in the center, 4-row
 *  legend. Zero accounts are omitted from the ring (equal greyed quarters
 *  when everything is zero) but always listed in the legend. */
export function BalanceDonut({ balances }: { balances: HomeBalances }) {
  const values: Record<(typeof SECTIONS)[number]['key'], number> = {
    cash: balances.bankUSD,
    wallet: balances.stealfUSD,
    encrypted: balances.encryptedUSD,
    earn: 0, // Grow isn't wired yet
  };
  const arcs = donutArcs(
    SECTIONS.map((s) => ({ key: s.key, value: values[s.key] })),
    { radius: RADIUS },
  );
  const colorOf = (key: string, empty?: boolean) =>
    empty ? EMPTY_STROKE : SECTIONS.find((s) => s.key === key)!.color;
  const { int, dec } = splitUsd(balances.totalUSD);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <G x={SIZE / 2} y={SIZE / 2}>
            {arcs.map((a) =>
              a.full ? (
                <Circle
                  key={a.key}
                  r={RADIUS}
                  stroke={colorOf(a.key)}
                  strokeWidth={STROKE}
                  fill="none"
                />
              ) : (
                <Path
                  key={a.key}
                  d={a.d}
                  stroke={colorOf(a.key, a.empty)}
                  strokeWidth={STROKE}
                  strokeLinecap="butt"
                  fill="none"
                />
              ),
            )}
          </G>
        </Svg>
        {/* Center total */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 26,
                  letterSpacing: -0.6,
                  color: T.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              ${int}
            </Text>
            <Text
              style={[
                sansationLight,
                { fontSize: 14, color: T.inkFaint, includeFontPadding: false },
              ]}
            >
              {dec}
            </Text>
          </View>
        </View>
      </View>

      {/* Legend — always the four accounts; zeros dimmed */}
      <View style={{ alignSelf: 'stretch', marginTop: 20, gap: 10 }}>
        {SECTIONS.map((s) => {
          const value = values[s.key];
          const zero = value <= 0;
          return (
            <View
              key={s.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: zero ? EMPTY_STROKE : s.color,
                }}
              />
              <Text
                style={[
                  sansation,
                  {
                    flex: 1,
                    fontSize: 13,
                    lineHeight: 18,
                    color: zero ? T.inkFaint : T.inkDim,
                    includeFontPadding: false,
                  },
                ]}
              >
                {s.label}
              </Text>
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 13,
                    lineHeight: 18,
                    color: zero ? T.inkFaint : T.ink,
                    includeFontPadding: false,
                  },
                ]}
              >
                ${value.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
