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
}: {
  top?: number;
  bottom?: number;
  leftPct: DimensionValue;
  rightPct: DimensionValue;
  height: number;
  alpha: number;
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
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={`rgba(220,220,225,${alpha})`} />
            <Stop offset="65%" stopColor="rgba(220,220,225,0)" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#halo)" />
      </Svg>
    </View>
  );
}

export function Welcome() {
  const router = useRouter();

  return (
    <Frame>
      <Halo top={-80} leftPct="8%" rightPct="8%" height={260} alpha={0.14} />
      <Halo bottom={-120} leftPct="15%" rightPct="15%" height={260} alpha={0.09} />

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
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
          <Text
            style={[
              serif,
              {
                fontSize: 72,
                lineHeight: 72,
                color: S.ink,
                letterSpacing: -2.88,
              },
            ]}
          >
            stealf
          </Text>
          <Text
            style={[
              serif,
              {
                fontSize: 72,
                lineHeight: 72,
                color: S.accent,
                letterSpacing: -2.88,
              },
            ]}
          >
            .
          </Text>
        </View>

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
