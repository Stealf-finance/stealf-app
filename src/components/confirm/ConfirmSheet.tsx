/** The confirmation sheet every money flow ends on — summary rows, slide-to-confirm, then the outcome in place. */
import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { SuccessCheck } from '@/src/design-system/primitives/SuccessCheck';
import { sansation } from '@/src/design-system/typography';
import { type Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { ConfirmRow } from './rows';

/** `pending` = broadcast, not settled. `slow` = settlement is late but still expected. */
export type ConfirmStatus = 'pending' | 'confirmed' | 'slow';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  /** Resets the flow for another transfer — adds a button next to Close. */
  onNewTransfer?: () => void;
  tone?: Tone;
  title: string;
  /** USD hero. Omitted when the flow has no price — the amount becomes the hero. */
  fiat?: number;
  /** Token amount under the hero, e.g. "1.5 SOL". */
  amountLabel?: string;
  /** Summary rows inside the card — build them with transferRows / tradeRows. */
  rows: ConfirmRow[];
  /** Fee rows below the card. */
  feeRows?: ConfirmRow[];
  onConfirm: () => void;
  slideLabel?: string;
  submitting?: boolean;
  signature?: string;
  error?: string;
  /** Celebrate on swipe rather than on the signature — for ops that run long. */
  optimistic?: boolean;
  status?: ConfirmStatus;
  successTitle?: string;
};

function Row({ label, value, sub }: ConfirmRow) {
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
          numberOfLines={1}
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
        >
          {value}
        </Text>
        {sub ? (
          <Text
            numberOfLines={1}
            style={[
              sansation,
              {
                fontSize: 12,
                color: T.inkFaint,
                marginTop: 2,
                includeFontPadding: false,
              },
            ]}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Success-footer glass button — equal-width in a row (flex on a static
 *  style: Pressable style-fns don't stretch). */
function FooterButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
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
          numberOfLines={1}
          style={[
            sansation,
            {
              fontSize: 14,
              fontWeight: '600',
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function ConfirmSheet({
  visible,
  onClose,
  onDone,
  onNewTransfer,
  tone = 'silver',
  title,
  fiat,
  amountLabel,
  rows,
  feeRows = [],
  onConfirm,
  slideLabel = 'Slide to confirm',
  submitting = false,
  signature,
  error,
  optimistic = false,
  status = optimistic ? 'pending' : 'confirmed',
  successTitle,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);

  useEffect(() => {
    if (visible) setSubmitted(false);
  }, [visible]);

  // A submit error rolls the sheet back to the summary so it stays actionable.
  useEffect(() => {
    if (error) setSubmitted(false);
  }, [error]);

  // Non-optimistic flows wait for the real signature before celebrating.
  useEffect(() => {
    if (!optimistic && signature) setSubmitted(true);
  }, [optimistic, signature]);

  const handleSlide = () => {
    if (optimistic) setSubmitted(true);
    onConfirm();
  };

  const settled = status === 'confirmed';
  const heading =
    successTitle ?? (settled ? 'Transaction sent' : 'Transaction submitted');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop + panel aligned on the receive-qr / ChoiceSheet recipe. */}
      <View style={{ flex: 1 }}>
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(8,8,10,0.5)' },
          ]}
        />
        <Pressable
          style={{ flex: 1 }}
          onPress={submitted ? undefined : onClose}
          disabled={submitted}
        />

        <View
          style={{
            backgroundColor: '#0d0d0d',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
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
                  {heading}
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
                  {settled ? (
                    <Text style={{ color: T.green, fontWeight: '600' }}>
                      confirmed
                    </Text>
                  ) : (
                    <Text style={{ color: T.gold, fontWeight: '600' }}>
                      pending
                    </Text>
                  )}
                </Text>
                {status === 'slow' ? (
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 12,
                        color: T.inkFaint,
                        marginTop: 10,
                        textAlign: 'center',
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    This is taking a moment. Your balance will update on its
                    own.
                  </Text>
                ) : null}
              </View>

              {signature ? (
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(`https://solscan.io/tx/${signature}`)
                    }
                    accessibilityRole="link"
                    accessibilityLabel="View on Solscan"
                    style={({ pressed }) => ({
                      paddingVertical: 12,
                      paddingHorizontal: 22,
                      borderRadius: 100,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: T.hairline,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: 10,
                          letterSpacing: 2.4,
                          textTransform: 'uppercase',
                          color: T.ink,
                          fontWeight: '600',
                          includeFontPadding: false,
                        },
                      ]}
                    >
                      View on Solscan ↗
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                {onNewTransfer ? (
                  <FooterButton
                    label="Make new transfer"
                    onPress={onNewTransfer}
                  />
                ) : null}
                <FooterButton label="Close" onPress={onDone} />
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(220)}
              onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <GlassBackButton onPress={onClose} />
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
                <View style={{ width: 26 }} />
              </View>

              <View
                style={{
                  alignItems: 'center',
                  paddingTop: 16,
                  paddingBottom: 18,
                  marginTop: 4,
                }}
              >
                {fiat === undefined ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      sansation,
                      {
                        fontSize: 40,
                        fontWeight: '700',
                        color: T.ink,
                        letterSpacing: -1.2,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {amountLabel}
                  </Text>
                ) : (
                  <>
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
                    {amountLabel ? (
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
                    ) : null}
                  </>
                )}
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 2,
                }}
              >
                {rows.map((row) => (
                  <Row key={row.label} {...row} />
                ))}
              </View>

              {feeRows.length > 0 ? (
                <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
                  {feeRows.map((row) => (
                    <Row key={row.label} {...row} />
                  ))}
                </View>
              ) : null}

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
