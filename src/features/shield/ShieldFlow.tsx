import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { TxTitleBlock } from '@/src/features/send/components/TxTitleBlock';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Direction = 'shield' | 'unshield';
type Asset = 'USDC' | 'SOL';

type Props = { direction: Direction };

const RATES: Record<Asset, number> = { USDC: 1, SOL: 88.47 };

const BALANCES: Record<Direction, Record<Asset, string>> = {
  shield: { USDC: '2,418.20', SOL: '5.4127' },
  unshield: { USDC: '544.50', SOL: '0.4212' },
};

const PILL_GRADIENTS: Record<Tone, [string, string]> = {
  silver: ['#e8e8ea', '#9a9a9f'],
  gold: ['#e6c079', '#a37b2e'],
};

export function ShieldFlow({ direction }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');
  const [asset, setAsset] = useState<Asset>('USDC');

  const isShield = direction === 'shield';
  const tone: Tone = isShield ? 'silver' : 'gold';
  const palette = txPalette(tone);
  const pillGradient = PILL_GRADIENTS[tone];

  const title = isShield ? 'Shield' : 'Unshield';
  const ctaLabel = isShield ? 'Slide to shield' : 'Slide to unshield';
  const directionLine = isShield
    ? 'Shield your assets to protect them'
    : 'Unshield to bring assets back public';
  const balance = BALANCES[direction][asset];
  const tokMark = asset === 'USDC' ? '$' : '◎';
  const fiat = (Number(amount) * RATES[asset]).toFixed(2);

  const close = () => router.back();
  const onKey = (k: string) => {
    if (k === '⌫') setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
    else if (k === '.') setAmount((a) => (a.includes('.') ? a : a + '.'));
    else setAmount((a) => (a === '0' ? k : a + k));
  };

  return (
    <TonalBackground tone={tone}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icons.close size={18} color={palette.inkDim} />
        </Pressable>
      </View>

      <TxTitleBlock
        tone={tone}
        kicker={title}
        title="How much?"
        subtitle={directionLine}
      />

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            paddingHorizontal: 28,
            gap: 4,
          }}
        >
          <Text
            style={[
              sansationLight,
              {
                fontSize: 84,
                letterSpacing: -4.2,
                color: palette.ink,
                lineHeight: 84,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {amount}
          </Text>
          <Text
            style={[
              serif,
              {
                fontSize: 30,
                color: palette.accent,
                fontStyle: 'italic',
                lineHeight: 30,
                includeFontPadding: false,
                marginLeft: 6,
              },
            ]}
          >
            {asset}
          </Text>
        </View>
        <Text
          style={[
            serif,
            {
              textAlign: 'center',
              marginTop: 10,
              fontStyle: 'italic',
              fontSize: 18,
              color: palette.inkDim,
            },
          ]}
        >
          ≈ ${fiat}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Pressable
          onPress={() => setAsset((a) => (a === 'USDC' ? 'SOL' : 'USDC'))}
          accessibilityRole="button"
          accessibilityLabel={`Asset ${asset}, tap to change`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 9,
            paddingLeft: 6,
            paddingRight: 16,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <LinearGradient
            colors={pillGradient}
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
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(0,0,0,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
              {tokMark}
            </Text>
          </View>
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: '#0a0a0a',
              },
            ]}
          >
            {asset}
          </Text>
          <View
            style={{
              width: 1,
              height: 10,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                color: '#0a0a0a',
                fontWeight: '500',
              },
            ]}
          >
            {balance} {asset}
          </Text>
          <Icons.chevR size={11} color="rgba(0,0,0,0.55)" />
        </Pressable>
      </View>

      <Numpad onKey={onKey} tone={tone} />

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <SwipeToSend tone={tone} label={ctaLabel} onSend={close} />
      </View>
    </TonalBackground>
  );
}
