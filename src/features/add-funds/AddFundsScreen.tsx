import { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  serif,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = { tone?: Tone };

const QR_MODULES = 25;
const QR_SIZE = 244;
const MODULE = QR_SIZE / QR_MODULES;
const FINDER = 7;

const ACCENT_GRADIENTS: Record<Tone, [string, string]> = {
  gold: ['#e6c079', '#a37b2e'],
  silver: ['#e8e8ea', '#9a9a9f'],
};

const ACCENT_DIM: Record<Tone, string> = {
  gold: 'rgba(230,192,121,0.22)',
  silver: 'rgba(232,232,234,0.2)',
};

export function AddFundsScreen({ tone = 'gold' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = txPalette(tone);
  const isGold = tone === 'gold';
  const accent = palette.accent;
  const chipGradient = ACCENT_GRADIENTS[tone];
  const accentDim = ACCENT_DIM[tone];
  const kickerColor = isGold ? 'rgba(230,192,121,0.85)' : T.inkFaint;

  const [network] = useState('Solana');
  const destination = isGold ? 'Stealth private' : 'Bank wallet';
  const address = '96t84T8vRqXp3zK...XTCdgY';

  const close = () => router.back();
  const noop = () => {};

  const dataModules = useMemo(() => buildPseudoQrModules(), []);

  return (
    <TonalBackground tone={tone}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
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
          Add funds
        </Text>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.close size={18} color={palette.inkDim} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 14, alignItems: 'center' }}>
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              color: kickerColor,
              fontWeight: '700',
            },
          ]}
        >
          — Deposit to {destination} —
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingLeft: 8,
            paddingRight: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Image
            source={require('@/assets/images/solana-icon.png')}
            resizeMode="contain"
            style={{ width: 24, height: 24, borderRadius: 12 }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                letterSpacing: 2.52,
                textTransform: 'uppercase',
                color: T.inkFaint,
                fontWeight: '700',
              },
            ]}
          >
            Network
          </Text>
          <Text
            style={[sansation, { fontSize: 14, color: T.ink, fontWeight: '500' }]}
          >
            {network}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: 28 }}>
        <View
          style={{
            width: 280,
            padding: 18,
            borderRadius: 28,
            backgroundColor: '#f6f2e8',
            shadowColor: isGold ? '#e6c079' : '#ffffff',
            shadowOpacity: isGold ? 0.25 : 0.08,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Svg width={QR_SIZE} height={QR_SIZE} viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}>
            {dataModules.map(([x, y], i) => (
              <Rect
                key={i}
                x={x * MODULE}
                y={y * MODULE}
                width={MODULE}
                height={MODULE}
                fill="#0a0a0a"
              />
            ))}
            <FinderPattern x={0} y={0} />
            <FinderPattern x={QR_MODULES - FINDER} y={0} />
            <FinderPattern x={0} y={QR_MODULES - FINDER} />
          </Svg>

        </View>
      </View>

      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Text
          style={[
            mono,
            {
              fontSize: 13,
              color: T.ink,
              letterSpacing: 0.26,
            },
          ]}
        >
          {address}
        </Text>
        <Pressable
          onPress={noop}
          accessibilityRole="button"
          accessibilityLabel="Copy address"
          hitSlop={6}
          style={{
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.copy size={14} color={T.inkDim} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 28, paddingBottom: 16, alignItems: 'center' }}>
        <Text
          style={[
            sansation,
            {
              fontSize: 11,
              color: T.inkFaint,
              lineHeight: 16,
              textAlign: 'center',
            },
          ]}
        >
          Only send{' '}
          <Text style={{ color: accent, fontWeight: '600' }}>{network}</Text>{' '}
          network tokens to this address.
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Pressable
          onPress={noop}
          accessibilityRole="button"
          accessibilityLabel="Copy address"
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: T.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icons.copy size={14} color={T.ink} />
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                letterSpacing: 2.42,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: T.ink,
              },
            ]}
          >
            Copy address
          </Text>
        </Pressable>
        <Pressable
          onPress={noop}
          accessibilityRole="button"
          accessibilityLabel="Share address"
          style={{
            flex: 1,
            borderRadius: 100,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            shadowColor: accentDim,
            shadowOpacity: 1,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <LinearGradient
            colors={chipGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icons.arrUpRight size={14} color="#0a0a0a" />
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.42,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color: '#0a0a0a',
                },
              ]}
            >
              Share
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </TonalBackground>
  );
}

function FinderPattern({ x, y }: { x: number; y: number }) {
  const px = x * MODULE;
  const py = y * MODULE;
  const size = FINDER * MODULE;
  const inset1 = MODULE;
  const inset2 = MODULE * 2;
  const inner1 = (FINDER - 2) * MODULE;
  const inner2 = (FINDER - 4) * MODULE;
  return (
    <>
      <Rect x={px} y={py} width={size} height={size} fill="#0a0a0a" />
      <Rect
        x={px + inset1}
        y={py + inset1}
        width={inner1}
        height={inner1}
        fill="#f6f2e8"
      />
      <Rect
        x={px + inset2}
        y={py + inset2}
        width={inner2}
        height={inner2}
        fill="#0a0a0a"
      />
    </>
  );
}

function buildPseudoQrModules(): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < QR_MODULES; y++) {
    for (let x = 0; x < QR_MODULES; x++) {
      if (isInFinder(x, y)) continue;
      const seed = (x * 73856093) ^ (y * 19349663);
      if ((seed >>> 0) % 100 < 48) out.push([x, y]);
    }
  }
  return out;
}

function isInFinder(x: number, y: number): boolean {
  const inTL = x < FINDER + 1 && y < FINDER + 1;
  const inTR = x > QR_MODULES - FINDER - 2 && y < FINDER + 1;
  const inBL = x < FINDER + 1 && y > QR_MODULES - FINDER - 2;
  return inTL || inTR || inBL;
}
