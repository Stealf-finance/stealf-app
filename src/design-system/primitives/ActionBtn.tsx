import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  accent?: boolean;
  large?: boolean;
};

export function ActionBtn({ icon, label, onPress, accent = false, large = false }: Props) {
  const dim = large ? 60 : 48;
  return (
    <Pressable onPress={onPress} className="items-center" style={{ gap: 8 }}>
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: accent ? T.gold : T.bgCardStrong,
          borderWidth: accent ? 0 : 1,
          borderColor: accent ? 'transparent' : T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: accent ? T.gold : 'transparent',
          shadowOpacity: accent ? 0.45 : 0,
          shadowRadius: accent ? 16 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: accent ? 8 : 0,
        }}
      >
        {icon}
      </View>
      <Text
        style={[
          sansation,
          {
            fontSize: 11,
            fontWeight: '400',
            letterSpacing: 0.2,
            color: accent ? T.gold : T.ink,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
