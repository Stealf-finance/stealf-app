import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { splitUsd } from '../lib/formatUsd';
import { buildHomeCards, type HomeGridCardVM } from '../lib/homeGridCards';
import type { HomeBalances } from '../lib/aggregateHomeBalances';

const GAP = 12;
const H_PAD = 24;

function CardValue({ vm, hidden }: { vm: HomeGridCardVM; hidden: boolean }) {
  const pal = txPalette(vm.accent);
  if ('teaser' in vm && vm.teaser) {
    return (
      <Text style={[sansationLight, { fontSize: 20, letterSpacing: -0.4, color: pal.ink }]}>
        {vm.teaser}
      </Text>
    );
  }
  const { int, dec } = splitUsd(vm.valueUSD ?? 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={[sansationLight, { fontSize: 24, letterSpacing: -0.5, color: pal.ink }]}>
        {hidden ? '$****' : `$${int}`}
      </Text>
      {hidden ? null : (
        <Text style={[sansation, { fontSize: 14, color: pal.inkDim }]}>{dec}</Text>
      )}
    </View>
  );
}

function HomeGridCard({ vm, hidden }: { vm: HomeGridCardVM; hidden: boolean }) {
  const pal = txPalette(vm.accent);
  const Icon = Icons[vm.iconKey];
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        backgroundColor: T.bgRaised,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: T.hairline,
        padding: 16,
        minHeight: 132,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: pal.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={pal.accent} />
      </View>
      <View style={{ gap: 2 }}>
        <CardValue vm={vm} hidden={hidden} />
        <Text style={[sansation, { fontSize: 13, letterSpacing: 0.2, color: pal.inkDim }]}>
          {vm.label}
        </Text>
      </View>
    </View>
  );
}

/** 2×2 grid of the four home cards: Cash, Earn, Encrypted Balance, Wallet. */
export function HomeGrid({ balances, hidden }: { balances: HomeBalances; hidden: boolean }) {
  const cards = buildHomeCards(balances);
  return (
    <View style={{ paddingHorizontal: H_PAD, gap: GAP }}>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <HomeGridCard vm={cards[0]} hidden={hidden} />
        <HomeGridCard vm={cards[1]} hidden={hidden} />
      </View>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <HomeGridCard vm={cards[2]} hidden={hidden} />
        <HomeGridCard vm={cards[3]} hidden={hidden} />
      </View>
    </View>
  );
}
