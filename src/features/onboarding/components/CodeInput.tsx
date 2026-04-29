import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View, Text } from 'react-native';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

const CELL = 6;

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  errored?: boolean;
};

/**
 * 6-digit verification code input.
 *
 * Visually shows 6 cells; underneath, a single hidden TextInput captures
 * keystrokes (paste-friendly, native keyboard, autofill from email/SMS).
 * Tapping any cell focuses the hidden input.
 *
 * Caller is responsible for triggering submit when value reaches 6 digits.
 */
export function CodeInput({
  value,
  onChange,
  onSubmit,
  disabled,
  errored,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  // Auto-focus on mount, refocus when error clears.
  useEffect(() => {
    if (disabled) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [disabled, errored]);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, CELL);
    onChange(cleaned);
    if (cleaned.length === CELL) {
      onSubmit();
    }
  };

  const cells = Array.from({ length: CELL }, (_, i) => value[i] ?? '');

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        accessibilityRole="text"
        accessibilityLabel="6 digit verification code"
        onPress={() => inputRef.current?.focus()}
        style={{ flexDirection: 'row', gap: 10 }}
      >
        {cells.map((digit, i) => {
          const filled = digit !== '';
          const active = i === Math.min(value.length, CELL - 1);
          return (
            <View
              key={i}
              style={{
                width: 44,
                height: 56,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errored
                  ? '#E5484D'
                  : filled
                    ? S.accent
                    : active
                      ? S.accentDim
                      : S.hairline,
                backgroundColor: 'rgba(255,255,255,0.02)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 26,
                    color: filled ? S.ink : S.inkFaint,
                    letterSpacing: -0.5,
                    includeFontPadding: false,
                  },
                ]}
              >
                {digit || '·'}
              </Text>
            </View>
          );
        })}
      </Pressable>

      {/* Hidden capture input. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        inputMode="numeric"
        editable={!disabled}
        maxLength={CELL}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />

      <Text
        style={[
          sansation,
          {
            marginTop: 18,
            fontSize: 11,
            color: S.inkFaint,
            letterSpacing: 0.6,
          },
        ]}
      >
        Tap any cell to edit
      </Text>
    </View>
  );
}
