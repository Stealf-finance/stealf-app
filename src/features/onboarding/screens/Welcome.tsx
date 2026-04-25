import { DimensionValue, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Frame } from '@/src/design-system/primitives/Frame';
import {
  sansation,
  sansationBold,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

function Halo({
  top,
  bottom,
  leftPct,
  rightPct,
  height,
  alpha,
  id,
}: {
  top?: number;
  bottom?: number;
  leftPct: DimensionValue;
  rightPct: DimensionValue;
  height: number;
  alpha: number;
  id: string;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        bottom,
        left: leftPct,
        right: rightPct,
        height,
        zIndex: 0,
      }}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient
            id={id}
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0" stopColor="#dcdcdd" stopOpacity={alpha} />
            <Stop offset="0.65" stopColor="#dcdcdd" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function Welcome() {
  const router = useRouter();

  return (
    <Frame>
      <Halo id="halo-top" top={-80} leftPct="8%" rightPct="8%" height={260} alpha={0.14} />
      <Halo id="halo-bottom" bottom={-120} leftPct="15%" rightPct="15%" height={260} alpha={0.09} />

      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          zIndex: 2,
        }}
      >
        <Text
          style={[
            serif,
            {
              fontSize: 72,
              lineHeight: 92,
              color: S.ink,
              letterSpacing: -2.88,
              marginBottom: 10,
              textAlign: 'center',
              includeFontPadding: false,
            },
          ]}
        >
          stealf<Text style={{ color: S.accent }}>.</Text>
        </Text>

        <Text
          style={[
            sansationBold,
            {
              fontSize: 9,
              letterSpacing: 3.78,
              textTransform: 'uppercase',
              color: S.accent,
              marginBottom: 48,
            },
          ]}
        >
          Private Banking
        </Text>

        <Text
          style={[
            sansationLight,
            {
              fontSize: 28,
              lineHeight: 34,
              letterSpacing: -0.56,
              color: S.ink,
              textAlign: 'center',
              marginBottom: 14,
              maxWidth: 280,
            },
          ]}
        >
          Your money, your rules.
        </Text>

        <Text
          style={[
            serif,
            {
              fontSize: 16,
              lineHeight: 24,
              color: S.inkDim,
              textAlign: 'center',
              maxWidth: 280,
            },
          ]}
        >
          Hold crypto. Spend cash. Stay private.
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96,
          paddingHorizontal: 28,
          gap: 10,
          zIndex: 2,
        }}
      >
        <Pressable
          onPress={() => router.push('/(auth)/invite')}
          style={{
            borderRadius: 100,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          }}
        >
          <LinearGradient
            colors={['#e8e8ea', '#9a9a9f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={[
                sansationBold,
                {
                  fontSize: 11,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: '#0a0a0a',
                },
              ]}
            >
              Create account
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 22,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.035)',
            borderWidth: 1,
            borderColor: S.hairline,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                letterSpacing: 2.64,
                textTransform: 'uppercase',
                color: S.ink,
                fontWeight: '700',
              },
            ]}
          >
            I already have an account
          </Text>
        </Pressable>
      </View>
    </Frame>
  );
}
