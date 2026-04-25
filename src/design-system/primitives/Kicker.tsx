import { Text, TextProps } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';

type Props = TextProps & { color?: string };

export function Kicker({ children, color = 'rgba(241,236,225,0.4)', style, ...rest }: Props) {
  return (
    <Text
      style={[
        sansationBold,
        {
          fontSize: 10,
          letterSpacing: 2.8,
          textTransform: 'uppercase',
          color,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
