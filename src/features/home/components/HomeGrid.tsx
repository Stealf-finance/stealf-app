import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { txPalette } from '@/src/design-system/palettes';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { splitUsd } from '../lib/formatUsd';
import { buildHomeCards, type HomeGridCardVM } from '../lib/homeGridCards';
import type { HomeBalances } from '../lib/aggregateHomeBalances';

const GAP = 12; // Sp.md — uniform spacing between cards (rows and columns)
// Matches the header's paddingHorizontal (24 / SCREEN_GUTTER) so the grid's
// outer edges line up with the greeting message.
const H_PAD = 24;

const CARD_IMAGE: Partial<Record<HomeGridCardVM['key'], number>> = {
  cash: require('@/assets/images/coin.png'),
  earn: require('@/assets/images/earn.png'),
  encrypted: require('@/assets/images/shield.png'),
  wallet: require('@/assets/images/wallet.png'),
};

function CardValue({ vm, hidden }: { vm: HomeGridCardVM; hidden: boolean }) {
  const pal = txPalette(vm.accent);
  if ('teaser' in vm && vm.teaser) {
    return (
      <Text style={[sansation, { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: pal.ink }]}>
        {vm.teaser}
      </Text>
    );
  }
  const { int, dec } = splitUsd(vm.valueUSD ?? 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={[sansation, { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: pal.ink }]}>
        {hidden ? '$****' : `$${int}`}
      </Text>
      {hidden ? null : (
        <Text style={[sansation, { fontSize: 14, lineHeight: 20, color: pal.inkDim }]}>{dec}</Text>
      )}
    </View>
  );
}

function HomeGridCard({
  vm,
  hidden,
  onPress,
}: {
  vm: HomeGridCardVM;
  hidden: boolean;
  onPress?: () => void;
}) {
  const pal = txPalette(vm.accent);
  const Icon = Icons[vm.iconKey];
  const image = CARD_IMAGE[vm.key];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    >
      <BlurGlass
        radius={22}
        innerStyle={{ padding: 20, aspectRatio: 1.15, justifyContent: 'space-between' }}
      >
        {image ? (
          <Image
            source={image}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 32, height: 32 }}
          />
        ) : (
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
        )}
        <View style={{ gap: 8 }}>
          <Text
            style={[
              sansation,
              { fontSize: 14, lineHeight: 20, letterSpacing: 0.2, color: pal.inkDim },
            ]}
          >
            {vm.label}
          </Text>
          <CardValue vm={vm} hidden={hidden} />
        </View>
      </BlurGlass>
    </Pressable>
  );
}

/** 2×2 grid of the four home cards: Cash, Earn, Encrypted Balance, Wallet. */
export function HomeGrid({ balances, hidden }: { balances: HomeBalances; hidden: boolean }) {
  const router = useSafeRouter();
  const cards = buildHomeCards(balances);
  const press = (c: HomeGridCardVM) =>
    c.route ? () => router.push(c.route as never) : undefined;
  return (
    <View style={{ paddingHorizontal: H_PAD, gap: GAP }}>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <HomeGridCard vm={cards[0]} hidden={hidden} onPress={press(cards[0])} />
        <HomeGridCard vm={cards[1]} hidden={hidden} onPress={press(cards[1])} />
      </View>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <HomeGridCard vm={cards[2]} hidden={hidden} onPress={press(cards[2])} />
        <HomeGridCard vm={cards[3]} hidden={hidden} onPress={press(cards[3])} />
      </View>
    </View>
  );
}
