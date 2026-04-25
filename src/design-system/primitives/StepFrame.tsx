import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackBtn } from './BackBtn';
import { StepBar } from './StepBar';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  back?: boolean;
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
  kicker?: string;
  title?: string;
  subtitle?: string;
  bottom?: ReactNode;
  children?: ReactNode;
};

export function StepFrame({
  tone = 'silver',
  back = false,
  onBack,
  step,
  totalSteps = 4,
  kicker,
  title,
  subtitle,
  bottom,
  children,
}: Props) {
  const router = useRouter();
  const palette = txPalette(tone);
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={{ flex: 1 }}>
      {/* Top bar: back + step indicator + spacer */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {back ? <BackBtn onPress={handleBack} /> : <View style={{ width: 36 }} />}
        {typeof step === 'number' ? (
          <StepBar current={step} total={totalSteps} tone={tone} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ width: 36 }} />
      </View>

      {/* Centered content area */}
      <View
        style={{
          position: 'absolute',
          top: 144,
          left: 0,
          right: 0,
          bottom: 140,
          paddingHorizontal: 28,
        }}
      >
        {kicker ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <View style={{ width: 18, height: 1, backgroundColor: palette.accentDim }} />
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 3.2,
                  textTransform: 'uppercase',
                  color: palette.accent,
                  fontWeight: '700',
                },
              ]}
            >
              {kicker}
            </Text>
            <View style={{ width: 18, height: 1, backgroundColor: palette.accentDim }} />
          </View>
        ) : null}

        {title ? (
          <Text
            style={[
              sansationLight,
              {
                fontSize: 32,
                lineHeight: 36,
                letterSpacing: -0.96,
                color: T.ink,
                textAlign: 'center',
                marginBottom: subtitle ? 10 : 24,
              },
            ]}
          >
            {title}
          </Text>
        ) : null}

        {subtitle ? (
          <Text
            style={[
              serif,
              {
                fontSize: 16,
                lineHeight: 22,
                color: palette.accent,
                textAlign: 'center',
                marginBottom: 32,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}

        <View style={{ flex: 1 }}>{children}</View>
      </View>

      {/* Bottom CTA slot */}
      {bottom ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 56,
            paddingHorizontal: 28,
          }}
        >
          {bottom}
        </View>
      ) : null}
    </View>
  );
}
