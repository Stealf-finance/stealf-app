import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { txPalette } from '@/src/design-system/palettes';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useReflectStats } from '@/src/features/reflect/hooks/useReflectData';
import {
  activeCardIndex,
  buildHomePromoCards,
  type HomePromoCardVM,
} from '../lib/homePromoCards';

const GAP = 12; // matches HomeGrid
const H_PAD = 24; // matches HomeGrid, so the card spans exactly the grid width
const HEIGHT = 92;
const ICON = 46;
const PAD = 16; // inside the card
// Keeps the subtitle clear of the dots pinned to the bottom-right corner.
const DOTS_RESERVE = 34;

const PAL = txPalette('silver');
const DOT_OFF = 'rgba(230,230,235,0.22)';

function CardIcon({ vm }: { vm: HomePromoCardVM }) {
  const shape = { width: ICON, height: ICON, borderRadius: 14 } as const;
  // The Stealf mark doubles as the STLF token icon, as on Public Balance.
  if (vm.key === 'stlf') {
    return (
      <Image
        source={require('@/assets/images/icon.png')}
        style={shape}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }
  // Icon discs rather than shield.png / store.png: both already sit in the
  // grid directly above, and repeating them one row down reads as a duplicate.
  const Glyph = vm.key === 'shield' ? Icons.shieldFull : Icons.gift;
  return (
    <View
      style={[
        shape,
        {
          backgroundColor: PAL.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Glyph size={21} color={PAL.accent} />
    </View>
  );
}

/** Pinned to the card's bottom-right, outside the pager, so the dots stay put
 *  while the pages slide under them. Indicator only — the swipe is the input. */
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: PAD,
        bottom: 12,
        flexDirection: 'row',
        gap: 5,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: i === active ? PAL.accent : DOT_OFF,
          }}
        />
      ))}
    </View>
  );
}

function Page({
  vm,
  width,
  onPress,
}: {
  vm: HomePromoCardVM;
  width: number;
  onPress: () => void;
}) {
  const label = vm.highlight
    ? `${vm.title} ${vm.highlight} ${vm.subtitle}`
    : `${vm.title} — ${vm.subtitle}`;

  // Layout lives on this plain View; the Pressable is a bare overlay. Inside a
  // ScrollView a touchable yields the responder on drag, so taps and swipes
  // both work without any responder negotiation of our own.
  return (
    <View
      style={{
        width,
        height: HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PAD,
        gap: 12,
      }}
    >
      <CardIcon vm={vm} />

      <View style={{ flex: 1, minWidth: 0, paddingRight: DOTS_RESERVE }}>
        <Text
          numberOfLines={1}
          style={[
            sansation,
            {
              fontSize: 16,
              lineHeight: 21,
              fontWeight: '600',
              letterSpacing: -0.2,
              color: PAL.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {vm.title}
          {vm.highlight ? (
            <Text style={{ color: T.green }}> {vm.highlight}</Text>
          ) : null}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            sansation,
            {
              fontSize: 13,
              lineHeight: 18,
              color: PAL.inkDim,
              marginTop: 1,
              includeFontPadding: false,
            },
          ]}
        >
          {vm.subtitle}
        </Text>
      </View>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** One promo card under the home grid, spanning the grid's width. The card is
 *  static; swiping pages its contents — the STLF and Shield prompts from the
 *  balance screens, then the gift-card store. */
export function HomePromoCarousel() {
  const { width } = useWindowDimensions();
  const router = useSafeRouter();
  const { data: stats } = useReflectStats();
  const [active, setActive] = useState(0);

  const cards = buildHomePromoCards(stats?.realtimeApy);
  // A page is exactly the card's inner width, which is what `pagingEnabled`
  // snaps by — so the two can never drift apart.
  const pageWidth = width - H_PAD * 2;

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActive(
      activeCardIndex(e.nativeEvent.contentOffset.x, pageWidth, cards.length),
    );

  return (
    <View style={{ paddingHorizontal: H_PAD, marginTop: GAP }}>
      <BlurGlass radius={22} innerStyle={{ height: HEIGHT }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSettled}
        >
          {cards.map((c) => (
            <Page
              key={c.key}
              vm={c}
              width={pageWidth}
              onPress={() => router.push(c.route as never)}
            />
          ))}
        </ScrollView>
        <Dots count={cards.length} active={active} />
      </BlurGlass>
    </View>
  );
}
