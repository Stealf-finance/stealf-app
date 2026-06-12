import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette, type Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_PATH = 'M18 30 L26 38 L42 22';
const CHECK_LEN = 36;

/** The animated success badge — halo springs in, then the checkmark draws
 *  itself. Ported from the old standalone success screen so the confirm sheet
 *  shows the same celebration in place. */
function SuccessCheck({ tone }: { tone: Tone }) {
  const palette = txPalette(tone);
  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);
  const checkProgress = useSharedValue(CHECK_LEN);

  useEffect(() => {
    haloOpacity.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.quad),
    });
    haloScale.value = withSpring(1, { damping: 14, mass: 0.8, stiffness: 140 });
    checkProgress.value = withDelay(
      220,
      withTiming(0, { duration: 360, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
  }, [checkProgress, haloOpacity, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkProgress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 104,
          height: 104,
          borderRadius: 52,
          borderWidth: 1.5,
          borderColor: palette.accent,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.02)',
          shadowColor: palette.accentGlow,
          shadowOpacity: 1,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 0 },
        },
        haloStyle,
      ]}
    >
      <Svg width={56} height={56} viewBox="0 0 60 60" fill="none">
        <Circle
          cx={30}
          cy={30}
          r={27}
          stroke={palette.accent}
          strokeWidth={1}
          opacity={0.3}
        />
        <AnimatedPath
          d={CHECK_PATH}
          stroke={palette.accent}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LEN}
          animatedProps={checkProps}
        />
      </Svg>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  tone: Tone;
  title: string;
  fiat: number;
  amountLabel: string;
  fromLabel: string;
  fromAddress?: string;
  toLabel: string;
  toAddress?: string;
  networkFeeUsd: number;
  privacyFeeUsd: number;
  onConfirm: () => void;
  signature?: string;
  showPrivacyFee?: boolean;
  slideLabel?: string;
  autoPending?: boolean;
  error?: string;
  submitting?: boolean;
};

/** One detail line: label on the left, a primary value (+ optional sub) on the
 *  right. Used for the From / Receiving address / Token rows. */
function DetailRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 12,
      }}
    >
      <Text
        style={[
          sansation,
          { fontSize: 13, color: T.inkFaint, includeFontPadding: false },
        ]}
      >
        {label}
      </Text>
      <View style={{ alignItems: 'flex-end', flexShrink: 1, marginLeft: 12 }}>
        <Text
          style={[
            sansation,
            {
              fontSize: 14,
              color: T.ink,
              fontWeight: '600',
              textAlign: 'right',
              includeFontPadding: false,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {sub ? (
          <Text
            style={[
              sansation,
              {
                fontSize: 12,
                color: T.inkFaint,
                marginTop: 2,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Move confirmation — a compact bottom sheet: title, hero amount ($ + token),
 *  the transfer details (from / receiving / token), fee breakdown, and a
 *  slide-to-confirm. */
export function MoveConfirm({
  visible,
  onClose,
  onDone,
  tone,
  title,
  fiat,
  amountLabel,
  fromLabel,
  fromAddress,
  toLabel,
  toAddress,
  networkFeeUsd,
  privacyFeeUsd,
  onConfirm,
  signature,
  showPrivacyFee = true,
  slideLabel = 'Slide to confirm',
  autoPending = true,
  error,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);

  useEffect(() => {
    if (visible) setSubmitted(false);
  }, [visible]);

  // A submit error rolls the optimistic pending state back to the confirm
  // view so the error is visible and the user can retry.
  useEffect(() => {
    if (error) setSubmitted(false);
  }, [error]);

  const handleSlide = () => {
    if (autoPending) setSubmitted(true);
    onConfirm();
  };

  const rows: [string, string][] = [
    ['Network fee', `$${networkFeeUsd.toFixed(4)}`],
    ...(showPrivacyFee
      ? ([['Privacy fee · 0.30%', `$${privacyFeeUsd.toFixed(2)}`]] as [
          string,
          string,
        ][])
      : []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        {/* Tap the dimmed area to dismiss (disabled once submitted) */}
        <Pressable
          style={{ flex: 1 }}
          onPress={submitted ? undefined : onClose}
          disabled={submitted}
        />

        <View
          style={{
            backgroundColor: T.bgRaised,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {/* grab handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: T.hairlineStrong,
              marginBottom: 18,
            }}
          />

          {submitted ? (
            <Animated.View
              entering={FadeIn.duration(260)}
              style={{ minHeight: bodyHeight || undefined }}
            >
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 18,
                }}
              >
                <SuccessCheck tone={tone} />
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 18,
                      fontWeight: '600',
                      color: T.ink,
                      includeFontPadding: false,
                      marginTop: 20,
                    },
                  ]}
                >
                  Transaction submitted
                </Text>
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 13,
                      color: T.inkFaint,
                      marginTop: 8,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  Status:{' '}
                  <Text style={{ color: T.gold, fontWeight: '600' }}>
                    pending
                  </Text>
                </Text>
              </View>

              {/* Solscan link — just above the Close button */}
              {signature ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`https://solscan.io/tx/${signature}`)
                  }
                  accessibilityRole="link"
                  accessibilityLabel="View on Solscan"
                  hitSlop={8}
                  style={({ pressed }) => ({
                    alignSelf: 'center',
                    marginBottom: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 13,
                        fontWeight: '600',
                        color: T.ink,
                        textDecorationLine: 'underline',
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    View on Solscan ↗
                  </Text>
                </Pressable>
              ) : null}

              {/* Close — same slot as the slide-to-move CTA */}
              <Pressable
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View
                  style={{
                    height: 56,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 15,
                        fontWeight: '600',
                        color: T.ink,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    Close
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(220)}
              onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
            >
              {/* Header: back + title */}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <BackBtn onPress={onClose} />
                <Text
                  style={[
                    sansation,
                    {
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '600',
                      color: T.ink,
                      textAlign: 'center',
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {title}
                </Text>
                <View style={{ width: 38 }} />
              </View>

              {/* Hero amount */}
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: 16,
                  paddingBottom: 18,
                  marginTop: 4,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'baseline' }}
                >
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 28,
                        fontWeight: '700',
                        color: T.inkDim,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    $
                  </Text>
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 48,
                        fontWeight: '700',
                        color: T.ink,
                        letterSpacing: -1.4,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {fiat.toFixed(2)}
                  </Text>
                </View>
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 13,
                      color: T.inkFaint,
                      marginTop: 6,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {amountLabel}
                </Text>
              </View>

              {/* Transfer details: From / Receiving address / Token */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 2,
                }}
              >
                <DetailRow
                  label="From"
                  value={fromLabel}
                  sub={fromAddress}
                />
                <DetailRow
                  label="Receiving address"
                  value={toLabel}
                  sub={toAddress}
                />
                <DetailRow
                  label="Token"
                  value={amountLabel}
                  sub={`$${fiat.toFixed(2)}`}
                />
              </View>

              {/* Fee rows */}
              <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
                {rows.map(([label, value]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: 13,
                          color: T.inkFaint,
                          includeFontPadding: false,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: 14,
                          color: T.ink,
                          fontWeight: '600',
                          includeFontPadding: false,
                        },
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Slide to confirm */}
              <View style={{ marginTop: 18 }}>
                {error ? (
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 12,
                        color: T.error,
                        textAlign: 'center',
                        marginBottom: 10,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {error}
                  </Text>
                ) : null}
                <SwipeToSend
                  key={error ?? 'ready'}
                  tone={tone}
                  label={submitting ? 'Sending…' : slideLabel}
                  onSend={handleSlide}
                  disabled={submitting}
                  loading={submitting}
                />
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}
