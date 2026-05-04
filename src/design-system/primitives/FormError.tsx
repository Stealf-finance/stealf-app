import { Text, TextStyle } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

interface FormErrorProps {
  message?: string | null;
  style?: TextStyle;
}

export function FormError({ message, style }: FormErrorProps) {
  if (!message) return null;
  return (
    <Text
      accessibilityRole="alert"
      style={[
        sansation,
        {
          textAlign: 'center',
          marginTop: 10,
          fontSize: 11,
          letterSpacing: 0.4,
          color: T.error,
        },
        style,
      ]}
    >
      {message}
    </Text>
  );
}
