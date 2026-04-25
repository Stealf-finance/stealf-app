import { Text, TextProps } from 'react-native';
import { serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export function Em({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[serif, { color: T.gold }, style]} {...rest}>
      {children}
    </Text>
  );
}
