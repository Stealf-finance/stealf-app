import { ReactNode } from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';

type Props = {
  value?: string;
  defaultValue?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  inputStyle?: StyleProp<TextStyle>;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  tone?: Tone;
};

export function Field({
  value,
  defaultValue,
  onChangeText,
  placeholder,
  leftIcon,
  rightSlot,
  inputStyle,
  keyboardType,
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry,
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.hairline,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 16,
          paddingLeft: leftIcon ? 18 : 20,
          paddingRight: rightSlot ? 14 : 20,
        }}
      >
        {leftIcon ? <View style={{ flexShrink: 0 }}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.inkFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          style={[
            sansation,
            {
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              color: T.ink,
              padding: 0,
            },
            inputStyle,
          ]}
        />
        {rightSlot ? <View style={{ flexShrink: 0 }}>{rightSlot}</View> : null}
      </LinearGradient>
    </View>
  );
}
