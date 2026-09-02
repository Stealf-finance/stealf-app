import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useUmbraRegistered } from '@/src/features/umbra/hooks/useUmbraRegistered';
import { txPalette } from '@/src/design-system/palettes';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { sansation } from '@/src/design-system/typography';
import { resolveValueState } from '@/src/lib/asyncValue';
import { splitUsd } from '../lib/formatUsd';
import { buildHomeCards, type HomeGridCardVM } from '../lib/homeGridCards';
import type { HomeBalancesResult } from '../hooks/useHomeBalances';

const GAP = 12; // Sp.md — uniform spacing between cards (rows and columns)
// Matches the header's paddingHorizontal (24 / SCREEN_GUTTER) so the grid's
// outer edges line up with the greeting message.
const H_PAD = 24;

// Cards without an entry fall back to the tinted icon disc below.
const CARD_IMAGE: Partial<Record<HomeGridCardVM['key'], number>> = {
  'public-balance': require('@/assets/images/coin.png'),
  earn: require('@/assets/images/earn.png'),
  'private-balance': require('@/assets/images/shield.png'),
  store: require('@/assets/images/store.png'),
};

function CardValue({ vm, hidden }: { vm: HomeGridCardVM; hidden: boolean }) {
  const pal = txPalette(vm.accent);
  if ('teaser' in vm && vm.teaser) {
    return (
      <Text
        style={[
          sansation,
          { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: pal.ink },
        ]}
      >
        {vm.teaser}
      </Text>
    );
  }
  const { int, dec } = splitUsd(vm.valueUSD ?? 0);
  // Hiding wins over loading — see HomeTotal.
  const state = hidden ? 'value' : resolveValueState(vm.valueUSD, vm.error ?? false);

  if (state !== 'value') {
    // Holds the 28-pt line height so the card's contents don't jump.
    return (
      <View style={{ height: 28, justifyContent: 'center' }}>
        {state === 'error' ? (
          <Text
            style={[
              sansation,
              { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: pal.inkFaint },
            ]}
          >
            &mdash;
          </Text>
        ) : (
          <Skeleton width={76} height={20} radius={6} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text
        style={[
          sansation,
          { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: pal.ink },
        ]}
      >
        {hidden ? '$****' : `$${int}`}
      </Text>
      {hidden ? null : (
        <Text
          style={[
            sansation,
            { fontSize: 14, lineHeight: 20, color: pal.inkDim },
          ]}
        >
          {dec}
        </Text>
      )}
    </View>
  );
}

function HomeGridCard({
  vm,
  hidden,
  onPress,
  locked = false,
}: {
  vm: HomeGridCardVM;
  hidden: boolean;
  onPress?: () => void;
  /** Until the wallet is registered with Umbra, draw a dotted outline around
   *  the card to flag it as not-yet-set-up. */
  locked?: boolean;
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
        innerStyle={{
          padding: 20,
          aspectRatio: 1.15,
          justifyContent: 'space-between',
        }}
      >
        {image ? (
          <Image
            source={image}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 40, height: 40 }}
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
              {
                fontSize: 14,
                lineHeight: 20,
                letterSpacing: 0.2,
                color: pal.inkDim,
              },
            ]}
          >
            {vm.label}
          </Text>
          <CardValue vm={vm} hidden={hidden} />
        </View>
      </BlurGlass>

      {/* Dotted outline sits just outside the card edge (overlay so the grid
          layout stays identical whether or not it's shown). */}
      {locked ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 25,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.28)',
            borderStyle: 'dotted',
          }}
        />
      ) : null}
    </Pressable>
  );
}

/** Grid of the four home cards, two per row: Public Balance / Private Balance,
 *  then Earn / Store. */
export function HomeGrid({
  balances,
  hidden,
}: {
  balances: HomeBalancesResult;
  hidden: boolean;
}) {
  const router = useSafeRouter();

  // The encrypted balance needs the wallet registered on Umbra for this network.
  const { registered } = useUmbraRegistered();

  const cards = buildHomeCards(balances, {
    bank: balances.bankError,
    encrypted: balances.encryptedError,
  });
  const press = (c: HomeGridCardVM) =>
    c.route ? () => router.push(c.route as never) : undefined;
  const locked = (c: HomeGridCardVM) =>
    c.key === 'private-balance' && registered === false;

  // Two per row. A trailing odd card stretches to the full width, which is what
  // the 3-card layout used to do by hand.
  const rows: HomeGridCardVM[][] = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));

  return (
    <View style={{ paddingHorizontal: H_PAD, gap: GAP }}>
      {rows.map((row) => (
        <View key={row[0].key} style={{ flexDirection: 'row', gap: GAP }}>
          {row.map((c) => (
            <HomeGridCard
              key={c.key}
              vm={c}
              hidden={hidden}
              onPress={press(c)}
              locked={locked(c)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
