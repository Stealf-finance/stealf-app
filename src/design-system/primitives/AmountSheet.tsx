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
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
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
  const keypadW = sheetW - PAD * 2;
  const keyW = keypadW / 3;
  const keyH = 70;

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
          }}
        >
          <LinearGradient
            colors={['#191918', '#0d0d0d']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingTop: 10,
              paddingBottom: insets.bottom + 12,
            }}
          >
            {/* Grabber */}
            <View
              style={{
                alignSelf: 'center',
                width: 38,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(241,236,225,0.16)',
                marginBottom: 18,
              }}
            />

            {/* Title */}
            <Text
              style={[
                sansation,
                {
                  fontSize: 17,
                  color: T.ink,
                  fontWeight: '600',
                  textAlign: 'center',
                  letterSpacing: 0,
                  paddingHorizontal: PAD,
                },
              ]}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={[
                  mono,
                  {
                    fontSize: 12,
                    color: T.inkFaint,
                    textAlign: 'center',
                    marginTop: 5,
                    letterSpacing: 0,
                    paddingHorizontal: PAD,
                  },
                ]}
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
                marginTop: 22,
                marginBottom: overMax ? 6 : 16,
                paddingHorizontal: PAD,
              }}
            >
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 34,
                    color: value ? T.inkDim : T.inkFaint,
                    marginRight: 6,
                  },
                ]}
              >
                {currency}
              </Text>
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 58,
                    letterSpacing: 0,
                    color: overMax ? T.error : value ? T.ink : T.inkFaint,
                  },
                ]}
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
                    color: T.error,
                    textAlign: 'center',
                    marginBottom: 12,
                    paddingHorizontal: PAD,
                    letterSpacing: 0,
                  },
                ]}
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
                  gap: 10,
                  marginBottom: 12,
                  paddingHorizontal: PAD,
                }}
              >
                {presets.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setValue(String(p))}
                    style={({ pressed }) => ({
                      minWidth: 74,
                      height: 34,
                      paddingHorizontal: 16,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: pressed
                        ? 'rgba(201,168,106,0.28)'
                        : 'rgba(241,236,225,0.1)',
                      backgroundColor: pressed
                        ? 'rgba(201,168,106,0.12)'
                        : 'rgba(241,236,225,0.045)',
                    })}
                  >
                    <Text style={[mono, { fontSize: 13, color: T.inkDim }]}>
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
                marginTop: 2,
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
                            width: 54,
                            height: 54,
                            borderRadius: 27,
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
            <Pressable
              onPress={submit}
              disabled={!valid || loading}
              style={({ pressed }) => ({
                marginTop: 12,
                marginHorizontal: PAD,
                height: 54,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: valid && !loading
                  ? T.gold
                  : 'rgba(241,236,225,0.08)',
                opacity: valid || loading ? (pressed ? 0.88 : 1) : 0.55,
              })}
            >
              {loading ? (
                <ActivityIndicator color={valid ? '#0a0a0a' : T.inkFaint} />
              ) : (
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 15,
                      fontWeight: '700',
                      letterSpacing: 0,
                      color: valid ? '#0a0a0a' : T.inkFaint,
                    },
                  ]}
                >
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
