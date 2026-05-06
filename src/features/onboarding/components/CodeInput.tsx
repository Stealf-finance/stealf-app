import { useEffect, useRef } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

const CELL = 6;
const ACCESSORY_ID = 'code-input-accessory';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  errored?: boolean;
};

export function CodeInput({
  value,
  onChange,
  onSubmit,
  disabled,
  errored,
}: Props) {
  const inputRef = useRef<TextInput>(null);

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
        inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
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

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: 'rgba(28,28,30,0.95)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <Pressable
              onPress={Keyboard.dismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss keyboard"
              hitSlop={8}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 15,
                    color: S.accent,
                    fontWeight: '600',
                  },
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}
