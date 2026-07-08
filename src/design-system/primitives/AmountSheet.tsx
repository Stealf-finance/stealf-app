/**
 * AmountSheet — reusable amount-entry bottom sheet with a custom numeric keypad.
 * Replaces Alert.prompt everywhere an amount is typed (Grow / STLF, xStocks, …).
 *
 * Controlled: the parent owns `visible` and closes on submit/cancel.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { mono, sansation, sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

const MAX_DECIMALS = 6;

const KEY_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

export type AmountSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  currency?: string;
  submitLabel?: string;
  presets?: number[];
  max?: number;
  loading?: boolean;
  onSubmit: (amount: number) => void;
  onClose: () => void;
};

function appendKey(value: string, key: string): string {
  if (key === 'del') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }
  const dot = value.indexOf('.');
  if (dot >= 0 && value.length - dot - 1 >= MAX_DECIMALS) return value;
  if (value === '0') return key;
  if (value.length >= 12) return value;
  return value + key;
}

export function AmountSheet({
  visible,
  title,
  subtitle,
  currency = '$',
  submitLabel = 'Confirm',
  presets,
  max,
  loading,
  onSubmit,
  onClose,
}: AmountSheetProps) {
  // React Compiler (enabled globally via app.config.ts, currently a beta with
  // known memoization-correctness gaps) mis-memoized this component's CTA on the
  // invalid→valid transition, making the Buy button vanish. This tiny modal
  // gains nothing from auto-memo, so opt it out entirely as a definitive guard.
  'use no memo';
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue('');
  }, [visible]);

  const amount = useMemo(() => Number(value || '0'), [value]);
  const overMax = max != null && amount > max;
  const valid = Number.isFinite(amount) && amount > 0 && !overMax;

  const submit = () => {
    if (!valid || loading) return;
    onSubmit(amount);
  };

  const sheetW = screenW;
  const PAD = 24;
  const SHEET_DESIRED_H = 690;
  const SHEET_TOP_GAP = 8;
  const SHEET_PADDING_TOP = 10;
  const SHEET_BOTTOM_GAP = 12;
  const GRABBER_H = 4;
  const GRABBER_MB = 18;
  const TITLE_H = 22;
  const SUBTITLE_MT = 5;
  const SUBTITLE_H = 15;
  const AMOUNT_MT = 16;
  const AMOUNT_H = 66;
  const AMOUNT_MB = overMax ? 6 : 12;
  const ERROR_H = 14;
  const ERROR_MB = 12;
  const PRESETS_H = 46;
  const PRESETS_MB = 14;
  const KEYPAD_MT = 2;
  const CTA_MT = 14;
  const CTA_H = 58;
  const KEY_MIN_H = 46;
  const KEY_MAX_H = 64;
  const hasSubtitle = Boolean(subtitle);
  const hasPresets = Boolean(presets && presets.length > 0);
  const availableSheetH = Math.max(
    0,
    Math.min(SHEET_DESIRED_H, screenH - insets.top - SHEET_TOP_GAP),
  );
  const sheetBottomPad = insets.bottom + SHEET_BOTTOM_GAP;
  const fixedChromeH =
    SHEET_PADDING_TOP +
    GRABBER_H +
    GRABBER_MB +
    TITLE_H +
    (hasSubtitle ? SUBTITLE_MT + SUBTITLE_H : 0) +
    AMOUNT_MT +
    AMOUNT_H +
    AMOUNT_MB +
    (overMax ? ERROR_H + ERROR_MB : 0) +
    (hasPresets ? PRESETS_H + PRESETS_MB : 0) +
    KEYPAD_MT +
    CTA_MT +
    CTA_H +
    sheetBottomPad;
  const computedKeyH = (availableSheetH - fixedChromeH) / KEY_ROWS.length;
  const keypadW = sheetW - PAD * 2;
  const keyW = keypadW / 3;
  const keyH = Math.max(KEY_MIN_H, Math.min(KEY_MAX_H, computedKeyH));
  const keyCircle = Math.max(40, Math.min(56, keyH - 8));
  const keyCircleRadius = keyCircle / 2;
  const ctaEnabled = valid && !loading;
  const ctaStyle = {
    marginTop: CTA_MT,
    marginHorizontal: PAD,
    height: CTA_H,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ctaEnabled
      ? 'rgba(201,168,106,0.92)'
      : 'rgba(241,236,225,0.16)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: ctaEnabled ? T.gold : 'rgba(241,236,225,0.1)',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.64)',
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        />

        {/* Sheet */}
        <View
          style={{
            width: sheetW,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: 'hidden',
            borderTopWidth: 1,
            borderColor: 'rgba(241,236,225,0.08)',
            maxHeight: availableSheetH,
          }}
        >
          <LinearGradient
            colors={['#191918', '#0d0d0d']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingTop: SHEET_PADDING_TOP,
              paddingBottom: sheetBottomPad,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                alignSelf: 'center',
                width: 38,
                height: GRABBER_H,
                borderRadius: 2,
                backgroundColor: 'rgba(241,236,225,0.16)',
                marginBottom: GRABBER_MB,
              }}
            />

            {/* Title */}
            <Text
              style={[
                sansation,
                {
                  fontSize: 17,
                  lineHeight: TITLE_H,
                  color: T.ink,
                  fontWeight: '600',
                  textAlign: 'center',
                  letterSpacing: 0,
                  paddingHorizontal: PAD,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={[
                  mono,
                  {
                    fontSize: 12,
                    lineHeight: SUBTITLE_H,
                    color: T.inkFaint,
                    textAlign: 'center',
                    marginTop: SUBTITLE_MT,
                    letterSpacing: 0,
                    paddingHorizontal: PAD,
                  },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}

            {/* Amount display */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'center',
                marginTop: AMOUNT_MT,
                marginBottom: AMOUNT_MB,
                paddingHorizontal: PAD,
              }}
            >
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 34,
                    lineHeight: 40,
                    color: value ? T.inkDim : T.inkFaint,
                    marginRight: 6,
                  },
                ]}
                numberOfLines={1}
              >
                {currency}
              </Text>
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 58,
                    lineHeight: 66,
                    letterSpacing: 0,
                    color: overMax ? T.error : value ? T.ink : T.inkFaint,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {value || '0'}
              </Text>
            </View>

            {overMax ? (
              <Text
                style={[
                  mono,
                  {
                    fontSize: 11,
                    lineHeight: ERROR_H,
                    color: T.error,
                    textAlign: 'center',
                    marginBottom: ERROR_MB,
                    paddingHorizontal: PAD,
                    letterSpacing: 0,
                  },
                ]}
                numberOfLines={1}
              >
                Max {max}
              </Text>
            ) : null}

            {/* Presets */}
            {presets && presets.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 12,
                  marginBottom: PRESETS_MB,
                  paddingHorizontal: PAD,
                }}
              >
                {presets.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setValue(String(p))}
                    style={({ pressed }) => ({
                      minWidth: 96,
                      flex: 1,
                      maxWidth: 108,
                      height: PRESETS_H,
                      paddingHorizontal: 18,
                      borderRadius: 23,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: pressed
                        ? 'rgba(201,168,106,0.4)'
                        : 'rgba(241,236,225,0.12)',
                      backgroundColor: pressed
                        ? 'rgba(201,168,106,0.14)'
                        : 'rgba(241,236,225,0.05)',
                    })}
                  >
                    <Text style={[mono, { fontSize: 17, color: T.ink }]}>
                      {currency}{p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Keypad */}
            <View
              style={{
                width: keypadW,
                alignSelf: 'center',
                marginTop: KEYPAD_MT,
              }}
            >
              {KEY_ROWS.map((row, ri) => (
                <View
                  key={ri}
                  style={{
                    width: keypadW,
                    height: keyH,
                    flexDirection: 'row',
                  }}
                >
                  {row.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => setValue((v) => appendKey(v, k))}
                      android_ripple={{
                        color: 'rgba(241,236,225,0.08)',
                        borderless: true,
                      }}
                      style={{
                        width: keyW,
                        height: keyH,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {({ pressed }) => (
                        <View
                          style={{
                            width: keyCircle,
                            height: keyCircle,
                            borderRadius: keyCircleRadius,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: pressed
                              ? 'rgba(241,236,225,0.10)'
                              : 'transparent',
                          }}
                        >
                          <Text
                            style={[
                              sansation,
                              {
                                fontSize: k === 'del' ? 23 : 30,
                                lineHeight: k === 'del' ? 28 : 36,
                                color: k === 'del' ? T.inkDim : T.ink,
                                textAlign: 'center',
                                letterSpacing: 0,
                              },
                            ]}
                          >
                            {k === 'del' ? '⌫' : k}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={submit}
              disabled={!valid || loading}
              activeOpacity={0.85}
              style={ctaStyle}
            >
              {loading ? (
                <ActivityIndicator color={valid ? '#0a0a0a' : T.inkFaint} />
              ) : (
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 0.2,
                      color: valid ? '#0a0a0a' : T.inkDim,
                    },
                  ]}
                >
                  {submitLabel}
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
