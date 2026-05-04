import { Text } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LoaderDots } from '@/src/design-system/primitives/LoaderDots';
import { sansationLight, serif } from '@/src/design-system/typography';
import { txPalette, Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  label: string;
  sub?: string;
  blurIntensity?: number;
};

export function LoaderOverlay({
  tone = 'silver',
  label,
  sub,
  blurIntensity = 40,
}: Props) {
  const palette = txPalette(tone);
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(220)}
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          gap: 18,
          backgroundColor: 'rgba(8,8,10,0.35)',
        }}
      >
        <LoaderDots color={palette.accent} size={10} bounce={10} />
        <Text
          style={[
            sansationLight,
            {
              fontSize: 18,
              color: T.ink,
              textAlign: 'center',
              letterSpacing: -0.36,
            },
          ]}
        >
          {label}
        </Text>
        {sub ? (
          <Text
            style={[
              serif,
              {
                fontSize: 13,
                fontStyle: 'italic',
                color: T.inkDim,
                textAlign: 'center',
                lineHeight: 19,
              },
            ]}
          >
            {sub}
          </Text>
        ) : null}
      </BlurView>
    </Animated.View>
  );
}
