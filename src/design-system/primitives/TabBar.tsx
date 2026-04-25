import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { sansation, sansationBold, serif } from '@/src/design-system/typography';

export type TabId = 'bank' | 'stealth' | 'invest' | 'profile';

type Props = {
  active: TabId;
  onTab: (id: TabId) => void;
  onMoove: () => void;
};

const TABS: { id: TabId; label: string; iconKey: keyof typeof Icons }[] = [
  { id: 'bank', label: 'Bank', iconKey: 'bank' },
  { id: 'stealth', label: 'Stealth', iconKey: 'shield' },
  { id: 'invest', label: 'Invest', iconKey: 'trend' },
  { id: 'profile', label: 'Profile', iconKey: 'user' },
];

export function TabBar({ active, onTab, onMoove }: Props) {
  return (
    <View
      className="absolute left-0 right-0 bottom-0"
      style={{ paddingTop: 14, paddingBottom: 34, paddingHorizontal: 16 }}
    >
      <BlurView intensity={20} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient
        colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.9)', 'rgba(10,10,10,0.98)']}
        locations={[0, 0.2, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor: T.hairline,
        }}
      />

      <View className="flex-row items-center justify-around">
        {TABS.slice(0, 2).map((t) => (
          <TabSlot key={t.id} t={t} active={active === t.id} onPress={() => onTab(t.id)} />
        ))}

        <Pressable
          onPress={onMoove}
          className="items-center"
          style={{ gap: 4, transform: [{ translateY: -14 }] }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: T.gold,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: T.gold,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
              borderWidth: 4,
              borderColor: 'rgba(10,10,10,0.8)',
            }}
          >
            <Icons.moove size={22} color="#0a0a0a" />
          </View>
          <Text style={[serif, { fontSize: 12, color: T.gold }]}>Moove</Text>
        </Pressable>

        {TABS.slice(2).map((t) => (
          <TabSlot key={t.id} t={t} active={active === t.id} onPress={() => onTab(t.id)} />
        ))}
      </View>
    </View>
  );
}

function TabSlot({
  t,
  active,
  onPress,
}: {
  t: (typeof TABS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const Icon = Icons[t.iconKey];
  return (
    <Pressable onPress={onPress} className="items-center" style={{ gap: 4 }}>
      <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={active ? T.ink : T.inkMute} />
      </View>
      <Text
        style={[
          active ? sansationBold : sansation,
          { fontSize: 10, letterSpacing: 0.2, color: active ? T.ink : T.inkMute },
        ]}
      >
        {t.label}
      </Text>
      {active && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: T.gold,
            marginTop: 2,
          }}
        />
      )}
    </Pressable>
  );
}
