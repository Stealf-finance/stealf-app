import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone } from '@/src/design-system/palettes';

type AcctSide = 'bank' | 'stealth';

type TokenKey = 'USDC' | 'EUR' | 'BTC' | 'SOL';
type TokenMeta = {
  symbol: TokenKey;
  prefix: string;
  bank: string;
  stealth: string;
  mark: string;
};

const TOKENS: Record<TokenKey, TokenMeta> = {
  USDC: { symbol: 'USDC', prefix: '$', bank: '$1,240.00', stealth: '$1,398.21', mark: '$' },
  EUR: { symbol: 'EUR', prefix: '€', bank: '€980.50', stealth: '€210.00', mark: '€' },
  BTC: { symbol: 'BTC', prefix: '₿', bank: '0.0214', stealth: '0.182', mark: '₿' },
  SOL: { symbol: 'SOL', prefix: '', bank: '12.4', stealth: '86.3', mark: 'S' },
};

const SIDE_TO_TONE: Record<AcctSide, Tone> = { bank: 'silver', stealth: 'gold' };

export function MooveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');
  const [direction, setDirection] = useState<'toStealth' | 'toBank'>('toStealth');
  const [bankToken] = useState<TokenKey>('USDC');
  const [stealthToken] = useState<TokenKey>('USDC');

  const close = () => router.back();
  const rot = useSharedValue(0);
  const swap = () => {
    setDirection((d) => {
      const next = d === 'toStealth' ? 'toBank' : 'toStealth';
      rot.value = withTiming(next === 'toStealth' ? 0 : 180, {
        duration: 320,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      return next;
    });
  };
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const onKey = (k: string) => {
    if (k === '⌫') setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
    else if (k === '.') setAmount((a) => (a.includes('.') ? a : a + '.'));
    else setAmount((a) => (a === '0' ? k : a + k));
  };

  const tokenForSide = (s: AcctSide): TokenKey =>
    s === 'bank' ? bankToken : stealthToken;
  const flowDown = direction === 'toStealth';

  return (
    <TonalBackground tone="gold">
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 20,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ width: 36 }} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          Move money
        </Text>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icons.close size={18} color={T.inkDim} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, position: 'relative' }}>
        <AccountCard
          side="bank"
          tokenKey={tokenForSide('bank')}
          amount={amount}
          sign={flowDown ? '−' : '+'}
          editable={!flowDown}
        />
        <View style={{ height: 12 }} />
        <AccountCard
          side="stealth"
          tokenKey={tokenForSide('stealth')}
          amount={amount}
          sign={flowDown ? '+' : '−'}
          editable={flowDown}
        />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <Pressable
            onPress={swap}
            accessibilityRole="button"
            accessibilityLabel="Swap direction"
            hitSlop={10}
            style={{
              width: 44,
              height: 44,
              shadowColor: '#000',
              shadowOpacity: 0.45,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LinearGradient
                colors={['#f1f1f3', '#9a9a9f']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              <Animated.View style={arrowStyle}>
                <Icons.arrDown size={18} color="#0a0a0a" />
              </Animated.View>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 40 }} />

      <Numpad onKey={onKey} tone="gold" />

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <SwipeToSend tone="gold" label="Slide to move" onSend={close} />
      </View>
    </TonalBackground>
  );
}

function AccountCard({
  side,
  tokenKey,
  amount,
  sign,
  editable,
}: {
  side: AcctSide;
  tokenKey: TokenKey;
  amount: string;
  sign: '+' | '−';
  editable: boolean;
}) {
  const tone = SIDE_TO_TONE[side];
  const isGold = tone === 'gold';
  const tok = TOKENS[tokenKey];
  const kicker = isGold ? 'Private · Stealth private' : 'Public · Bank wallet';
  const balance = side === 'bank' ? tok.bank : tok.stealth;

  const cardColors: [string, string] = isGold
    ? ['rgba(212,165,83,0.14)', 'rgba(163,123,46,0.05)']
    : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.015)'];
  const cardBorder = isGold ? 'rgba(212,165,83,0.25)' : 'rgba(255,255,255,0.08)';
  const chipColors: [string, string] = isGold
    ? ['#e6c079', '#a37b2e']
    : ['#e8e8ea', '#9a9a9f'];
  const kickerColor = isGold ? 'rgba(230,192,121,0.85)' : T.inkFaint;

  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: cardBorder,
        overflow: 'hidden',
        minHeight: 118,
      }}
    >
      <LinearGradient
        colors={cardColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 22,
          paddingHorizontal: 20,
          gap: 14,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: kickerColor,
            },
          ]}
        >
          — {kicker} —
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ gap: 6, alignItems: 'flex-start' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 6,
                paddingLeft: 6,
                paddingRight: 10,
                borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LinearGradient
                  colors={chipColors}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#0a0a0a',
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {tok.mark}
                </Text>
              </View>
              <Text
                style={[
                  sansation,
                  { fontSize: 13, color: T.ink, fontWeight: '500' },
                ]}
              >
                {tok.symbol}
              </Text>
              <Icons.chevR size={11} color={T.inkDim} />
            </View>
            <Text style={{ fontSize: 11, color: T.inkFaint, paddingLeft: 4 }}>
              Balance {balance}
            </Text>
          </View>

          <Text
            style={[
              serif,
              {
                fontSize: 42,
                fontStyle: 'italic',
                fontWeight: '300',
                color: editable ? T.ink : T.inkDim,
                letterSpacing: -1.26,
                lineHeight: 42,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {sign}
            {tok.prefix}
            {amount}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
