import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation } from '@/src/design-system/typography';
import type { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

// How long the "submitted · pending" state shows before the sheet hands off
// to the real pending op (which continues in the navbar) and closes.
const PENDING_DWELL_MS = 1200;

type Props = {
  visible: boolean;
  onClose: () => void;
  tone: Tone;
  /** e.g. "Move to Virtual Bank Account". */
  title: string;
  /** Fiat value of the move (numeric, USD). */
  fiat: number;
  /** Token amount line, e.g. "1.5 SOL". */
  amountLabel: string;
  networkFeeUsd: number;
  privacyFeeUsd: number;
  onConfirm: () => void;
};

/** Move confirmation — a compact bottom sheet: title, hero amount ($ + token),
 *  fee breakdown, and a slide-to-confirm. */
export function MoveConfirm({
  visible,
  onClose,
  tone,
  title,
  fiat,
  amountLabel,
  networkFeeUsd,
  privacyFeeUsd,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);

  // Reset whenever the sheet (re)opens so a fresh confirm always shows.
  useEffect(() => {
    if (visible) setSubmitted(false);
  }, [visible]);

  const handleSlide = () => {
    setSubmitted(true);
    setTimeout(onConfirm, PENDING_DWELL_MS);
  };

  const rows: [string, string][] = [
    ['Network fee', `$${networkFeeUsd.toFixed(4)}`],
    ['Privacy fee · 0.30%', `$${privacyFeeUsd.toFixed(2)}`],
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
            <View style={{ alignItems: 'center', paddingVertical: 14 }}>
              <Image
                source={require('@/assets/images/sablier.png')}
                contentFit="contain"
                style={{ width: 76, height: 76, marginBottom: 16 }}
              />
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 18,
                    fontWeight: '600',
                    color: T.ink,
                    includeFontPadding: false,
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
                    marginTop: 6,
                    includeFontPadding: false,
                  },
                ]}
              >
                Pending
              </Text>
            </View>
          ) : (
            <>
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

          {/* Fee rows */}
          {rows.map(([label, value]) => (
            <View
              key={label}
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

          {/* Slide to confirm */}
          <View style={{ marginTop: 20 }}>
            <SwipeToSend tone={tone} label="Slide to move" onSend={handleSlide} />
          </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
