/**
 * AmountSheet — a reusable, on-brand amount-entry bottom sheet with a custom
 * numeric keypad. Replaces the default iOS `Alert.prompt` everywhere an amount
 * is typed (Grow / STLF, xStocks, …) so the UX stays consistent and premium.
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
  /** Small line under the title, e.g. "Balance 12.40 USDC". */
  subtitle?: string;
  /** Currency glyph/label shown before the amount. Default "$". */
  currency?: string;
  /** CTA label. Default "Confirm". */
  submitLabel?: string;
  /** Optional quick-select amounts (e.g. [10, 50, 100]). */
  presets?: number[];
  /** Optional upper bound; amounts above it are rejected. */
  max?: number;
  /** Shows a spinner + disables the CTA (e.g. while a tx is in flight). */
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
  // digit
  const dot = value.indexOf('.');
  if (dot >= 0 && value.length - dot - 1 >= MAX_DECIMALS) return value; // decimal cap
  if (value === '0') return key; // no leading zeros ("0" -> "5")
  if (value.length >= 12) return value; // sane cap
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
  // Fixed key width from the screen: 24px sheet padding each side + two 8px gaps.
  const keyW = (screenW - 48 - 16) / 3;
  const [value, setValue] = useState('');

  // Reset the field each time the sheet opens.
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
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
      />

      {/* Sheet */}
      <View
        style={{
          width: '100%',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <LinearGradient
          colors={['rgba(26,26,28,0.99)', 'rgba(10,10,12,1)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Grabber */}
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.14)',
              marginBottom: 16,
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
              marginTop: 26,
              marginBottom: 18,
            }}
          >
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 26,
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
                  fontSize: 52,
                  letterSpacing: -1,
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
                { fontSize: 11, color: T.error, textAlign: 'center', marginBottom: 8 },
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
                marginBottom: 18,
              }}
            >
              {presets.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setValue(String(p))}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={[mono, { fontSize: 13, color: T.inkDim }]}>
                    {currency}
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Keypad — fixed-width 3-column grid (bulletproof inside a Modal) */}
          <View>
            {KEY_ROWS.map((row, ri) => (
              <View
                key={ri}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                {row.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setValue((v) => appendKey(v, k))}
                    android_ripple={{ color: 'rgba(255,255,255,0.10)' }}
                    style={({ pressed }) => ({
                      width: keyW,
                      height: 58,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: pressed
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    })}
                  >
                    <Text
                      style={[
                        sansation,
                        {
                          fontSize: k === 'del' ? 22 : 24,
                          color: T.ink,
                          fontWeight: '500',
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
              marginTop: 18,
              height: 54,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                valid && !loading ? T.gold : 'rgba(255,255,255,0.08)',
              opacity: valid || loading ? 1 : 0.6,
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
