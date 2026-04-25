import { ReactNode } from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  value?: string;
  defaultValue?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  rightSlot?: ReactNode;
  fontSize?: number;
  inputStyle?: StyleProp<TextStyle>;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  tone?: Tone;
};

export function UnderlineField({
  value,
  defaultValue,
  onChangeText,
  placeholder,
  prefix,
  rightSlot,
  fontSize = 26,
  inputStyle,
  keyboardType,
  autoCapitalize = 'none',
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: palette.accent,
      }}
    >
      {prefix ? (
        <Text
          style={[
            serif,
            {
              fontSize,
              lineHeight: fontSize,
              color: palette.accent,
              flexShrink: 0,
            },
          ]}
        >
          {prefix}
        </Text>
      ) : null}
      <TextInput
        value={value}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.inkFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          sansationLight,
          {
            flex: 1,
            minWidth: 0,
            fontSize,
            letterSpacing: -0.26,
            color: T.ink,
            padding: 0,
          },
          inputStyle,
        ]}
      />
      {rightSlot ? <View style={{ flexShrink: 0 }}>{rightSlot}</View> : null}
    </View>
  );
}
