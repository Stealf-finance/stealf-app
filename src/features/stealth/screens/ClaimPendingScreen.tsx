import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { Palette, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Tab = 'coming' | 'incoming';
type Asset = 'USDC' | 'SOL';
type Item = { amount: string; asset: Asset; ago: string };

const INCOMING: Item[] = [
  { amount: '420.00', asset: 'USDC', ago: '2 min ago' },
  { amount: '0.4212', asset: 'SOL', ago: '18 min ago' },
  { amount: '124.50', asset: 'USDC', ago: '1 h ago' },
  { amount: '12.0000', asset: 'USDC', ago: '4 h ago' },
];

const COMING: Item[] = [
  { amount: '1,200.00', asset: 'USDC', ago: 'in ~3 min' },
  { amount: '0.8500', asset: 'SOL', ago: 'in ~12 min' },
];

const TOTAL_INCOMING = '544.50';
const TOTAL_COMING = '1,343.50';

const GOLD_GRADIENT: [string, string] = ['#e6c079', '#a37b2e'];

export function ClaimPendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = txPalette('gold');

  const [tab, setTab] = useState<Tab>('incoming');
  const [tabsWidth, setTabsWidth] = useState(0);
  const tabProgress = useSharedValue(1);

  useEffect(() => {
    tabProgress.value = withTiming(tab === 'incoming' ? 1 : 0, {
      duration: 250,
    });
  }, [tab, tabProgress]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * (tabsWidth / 2) }],
  }));

  const close = () => router.back();

  const list = tab === 'incoming' ? INCOMING : COMING;
  const total = tab === 'incoming' ? TOTAL_INCOMING : TOTAL_COMING;
  const headerLabel =
    tab === 'incoming'
      ? `${INCOMING.length} pending · Stealth private`
      : `${COMING.length} on the way · Stealth private`;

  return (
    <TonalBackground tone="gold">
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingBottom: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: T.bgCardStrong,
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Icons.arrLeft size={14} color={T.ink} />
        </Pressable>
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Claim pending
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View
          style={{ flexDirection: 'row', position: 'relative' }}
          onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
        >
          {(['coming', 'incoming'] as const).map((id) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 12,
                      letterSpacing: 3.84,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      color: active ? T.ink : T.inkFaint,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {id === 'coming' ? 'Coming' : 'Incoming'}
                </Text>
              </Pressable>
            );
          })}

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 1,
              backgroundColor: T.hairline,
            }}
          />

          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                width: '50%',
                backgroundColor: palette.accent,
                shadowColor: palette.accentGlow,
                shadowOpacity: 1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              },
              underlineStyle,
            ]}
          />
        </View>
      </View>

      <View
        style={{
          paddingTop: 18,
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              color: 'rgba(230,192,121,0.85)',
              fontWeight: '700',
              marginBottom: 14,
            },
          ]}
        >
          — {headerLabel} —
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={[
              serif,
              {
                fontSize: 28,
                color: palette.accent,
                fontStyle: 'italic',
                lineHeight: 28,
                includeFontPadding: false,
              },
            ]}
          >
            $
          </Text>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 54,
                letterSpacing: -1.62,
                lineHeight: 54,
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {total}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {list.map((tx, i) => (
          <ClaimItem
            key={`${tab}-${i}`}
            tx={tx}
            kind={tab}
            palette={palette}
          />
        ))}
      </ScrollView>
    </TonalBackground>
  );
}

function ClaimItem({
  tx,
  kind,
  palette,
}: {
  tx: Item;
  kind: Tab;
  palette: Palette;
}) {
  const isIncoming = kind === 'incoming';
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(212,165,83,0.18)',
        opacity: isIncoming ? 1 : 0.85,
      }}
    >
      <LinearGradient
        colors={['rgba(212,165,83,0.10)', 'rgba(163,123,46,0.03)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconChip kind={kind} accent={palette.accent} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: T.ink,
                  fontWeight: '500',
                  includeFontPadding: false,
                },
              ]}
            >
              Encrypted sender
            </Text>
            <Text
              style={[
                mono,
                {
                  fontSize: 10,
                  color: T.inkFaint,
                  marginTop: 3,
                  letterSpacing: 0.4,
                },
              ]}
            >
              {tx.ago}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                serif,
                {
                  fontSize: 18,
                  fontStyle: 'italic',
                  color: T.ink,
                  lineHeight: 18,
                  includeFontPadding: false,
                },
              ]}
            >
              +{tx.amount}
            </Text>
            <Text
              style={[
                sansation,
                {
                  fontSize: 9,
                  letterSpacing: 1.62,
                  textTransform: 'uppercase',
                  color: palette.accent,
                  fontWeight: '700',
                  marginTop: 4,
                },
              ]}
            >
              {tx.asset}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          {isIncoming ? (
            <ClaimButton accentGlow={palette.accentGlow} />
          ) : (
            <AwaitingPill accent={palette.accent} />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function IconChip({ kind, accent }: { kind: Tab; accent: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {kind === 'incoming' ? (
        <Icons.arrDown size={16} color={accent} strokeWidth={1.8} />
      ) : (
        <Icons.clock size={16} color={accent} strokeWidth={1.6} />
      )}
    </View>
  );
}

function ClaimButton({ accentGlow }: { accentGlow: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Claim"
      style={{
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: accentGlow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={GOLD_GRADIENT}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icons.check size={12} color="#0a0a0a" strokeWidth={2.4} />
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: '#0a0a0a',
            },
          ]}
        >
          Claim
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function AwaitingPill({ accent }: { accent: string }) {
  return (
    <View
      style={{
        paddingVertical: 9,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: T.hairline,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: accent,
          shadowColor: accent,
          shadowOpacity: 1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Text
        style={[
          sansation,
          {
            fontSize: 10,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            fontWeight: '700',
            color: T.inkDim,
          },
        ]}
      >
        Awaiting confirmation
      </Text>
    </View>
  );
}
