/**
 * STLF buy/sell confirmation — the Shield/Send sheet recipe applied to a trade:
 * quote summary, slide-to-confirm, then the pending / settled states in place.
 * Settlement comes from the wallet's `balance:updated` socket event, so the
 * pending copy stays truthful while the webhook catches up.
 */
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
import type { StlfSettlementStatus } from '../hooks/useStlfSettlement';

const TONE: Tone = 'silver';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  isBuy: boolean;
  fiat: number;
  payLabel: string;
  receiveLabel: string;
  rateLabel: string;
  networkFeeUsd: number;
  onConfirm: () => void;
  submitting: boolean;
  signature?: string;
  settlement: StlfSettlementStatus;
  error?: string;
};

/** One summary line: label left, value right. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
      <Text
        numberOfLines={1}
        style={[
          sansation,
          {
            fontSize: 14,
            fontWeight: '600',
            color: T.ink,
            marginLeft: 12,
            flexShrink: 1,
            textAlign: 'right',
            includeFontPadding: false,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function StlfConfirmSheet({
  visible,
  onClose,
  onDone,
  isBuy,
  fiat,
  payLabel,
  receiveLabel,
  rateLabel,
  networkFeeUsd,
  onConfirm,
  submitting,
  signature,
  settlement,
  error,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) setSubmitted(false);
  }, [visible]);

  // A submit error rolls the sheet back to the quote so it stays actionable.
  useEffect(() => {
    if (error) setSubmitted(false);
  }, [error]);

  // The signature means broadcast, not settled — celebrate there and let the
  // socket downgrade the status line from pending to confirmed.
  useEffect(() => {
    if (signature) setSubmitted(true);
  }, [signature]);

  const title = isBuy ? 'Buy STLF' : 'Sell STLF';
  const settled = settlement === 'settled';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
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
            <Animated.View entering={FadeIn.duration(260)}>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 18,
                }}
              >
                <SuccessCheck tone={TONE} />
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
                  {isBuy ? 'Purchase submitted' : 'Sale submitted'}
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
                {settlement === 'slow' ? (
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

              <Pressable
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Close"
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
                        fontSize: 14,
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
            <Animated.View entering={FadeIn.duration(220)}>
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
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
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
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 2,
                }}
              >
                <Row label="You pay" value={payLabel} />
                <Row label="You receive" value={receiveLabel} />
                <Row label="Rate" value={rateLabel} />
              </View>

              <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
                <Row
                  label="Network fee"
                  value={`$${networkFeeUsd.toFixed(4)}`}
                />
              </View>

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
                  tone={TONE}
                  label={
                    submitting
                      ? 'Submitting…'
                      : `Slide to ${isBuy ? 'buy' : 'sell'}`
                  }
                  onSend={onConfirm}
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
