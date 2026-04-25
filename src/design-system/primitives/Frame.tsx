import { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  variant?: 'dark' | 'light';
};

export function Frame({ children, variant = 'dark' }: Props) {
  return (
    <View
      className={`flex-1 ${variant === 'light' ? 'bg-bg-light' : 'bg-bg'}`}
    >
      {children}
    </View>
  );
}
