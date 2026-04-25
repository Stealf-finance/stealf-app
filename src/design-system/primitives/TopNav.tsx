import { Pressable, Text, View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { sansation, sansationBold, sansationLight } from '@/src/design-system/typography';

type Props = {
  active: 'bank' | 'stealth';
  onChange: (v: 'bank' | 'stealth') => void;
  initial?: string;
  onProfile?: () => void;
};

export function TopNav({ active, onChange, initial = 'T', onProfile }: Props) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 }}
    >
      <View className="flex-row items-baseline" style={{ gap: 20 }}>
        <Pressable onPress={() => onChange('bank')}>
          <Text
            style={[
              active === 'bank' ? sansationBold : sansationLight,
              {
                fontSize: 22,
                letterSpacing: -0.5,
                color: active === 'bank' ? T.ink : T.inkFaint,
              },
            ]}
          >
            Bank
          </Text>
        </Pressable>
        <Pressable onPress={() => onChange('stealth')}>
          <Text
            style={[
              active === 'stealth' ? sansationBold : sansationLight,
              {
                fontSize: 22,
                letterSpacing: -0.5,
                color: active === 'stealth' ? T.ink : T.inkFaint,
              },
            ]}
          >
            Stealth
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onProfile}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: T.bgCardStrong,
          borderWidth: 1,
          borderColor: T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[sansationBold, { fontSize: 13, color: T.ink }]}>{initial}</Text>
      </Pressable>
    </View>
  );
}
