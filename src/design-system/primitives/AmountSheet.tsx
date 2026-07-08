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

  // Each key is 1/3 of the sheet interior (sheet has 20px padding each side)
  const PAD = 20;
  const KEY_GAP = 0; // no gap — keys are flush columns, touch area is the full cell
  const keyW = (screenW - PAD * 2) / 3;
  const keyH = 72;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
      />

      {/* Sheet */}
      <View
        style={{
          width: '100%',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <LinearGradient
          colors={['rgba(24,24,26,1)', 'rgba(10,10,12,1)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            paddingTop: 10,
            paddingBottom: insets.bottom + 12,
          }}
        >
          {/* Grabber */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.12)',
              marginBottom: 14,
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
                letterSpacing: -0.17,
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
                  marginTop: 4,
                  letterSpacing: 0.2,
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
              marginTop: 20,
              marginBottom: 14,
              paddingHorizontal: PAD,
            }}
          >
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 24,
                  color: value ? T.inkDim : T.inkFaint,
                  marginRight: 4,
                },
              ]}
            >
              {currency}
            </Text>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 56,
                  letterSpacing: -2,
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
                  marginBottom: 6,
                  paddingHorizontal: PAD,
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
                gap: 8,
                marginBottom: 14,
                paddingHorizontal: PAD,
              }}
            >
              {presets.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setValue(String(p))}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={[mono, { fontSize: 13, color: T.inkDim }]}>
                    {currency}{p}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Divider above keypad */}
          <View
            style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.06)',
              marginBottom: 4,
            }}
          />

          {/* Keypad — full-width, no cell background, large centered digits */}
          <View>
            {KEY_ROWS.map((row, ri) => (
              <View
                key={ri}
                style={{ flexDirection: 'row' }}
              >
                {row.map((k, ki) => (
                  <Pressable
                    key={k}
                    onPress={() => setValue((v) => appendKey(v, k))}
                    android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
                    style={({ pressed }) => ({
                      width: keyW,
                      height: keyH,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                      // subtle right border between columns (not after last)
                      borderRightWidth: ki < 2 ? 1 : 0,
                      borderBottomWidth: ri < 3 ? 1 : 0,
                      borderColor: 'rgba(255,255,255,0.05)',
                    })}
                  >
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: k === 'del' ? 22 : 30,
                          color: k === 'del' ? T.inkDim : T.ink,
                          fontWeight: '300',
                        },
                      ]}
                    >
                      {k === 'del' ? '⌫' : k}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={submit}
            disabled={!valid || loading}
            style={{
              marginTop: 14,
              marginHorizontal: PAD,
              height: 54,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: valid && !loading ? T.gold : 'rgba(255,255,255,0.08)',
              opacity: valid || loading ? 1 : 0.55,
            }}
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
                    letterSpacing: 0.2,
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
    </Modal>
  );
}
