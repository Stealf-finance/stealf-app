import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

export type TabId = 'bank' | 'stealth' | 'profile';

type Props = {
  active: TabId;
  onTab: (id: TabId) => void;
  tone?: Tone;
};

// `id` stays internal (route segment + tone logic); only label/icon are UI.
const TABS: { id: TabId; label: string; iconKey: keyof typeof Icons }[] = [
  { id: 'bank', label: 'Home', iconKey: 'tabHome' },
  { id: 'stealth', label: 'Payment', iconKey: 'tabPayment' },
  { id: 'profile', label: 'Profile', iconKey: 'tabProfile' },
];

export function TabBar({ active, onTab, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <BlurView
        intensity={24}
        tint="dark"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        colors={[
          'rgba(10,10,10,0)',
          'rgba(10,10,10,0.85)',
          'rgba(10,10,10,0.96)',
        ]}
        locations={[0, 0.3, 1]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Top hairline: transparent → accent → transparent across the bar */}
      <LinearGradient
        colors={['transparent', palette.accent, palette.accent, 'transparent']}
        locations={[0, 0.2, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          opacity: tone === 'silver' ? 0.5 : 0.65,
        }}
      />

      {/* Tab row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingTop: 16,
          paddingBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          const Icon = Icons[t.iconKey];
          return (
            <Pressable
              key={t.id}
              onPress={() => onTab(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t.label}
              style={{
                alignItems: 'center',
                gap: 6,
                minWidth: 60,
              }}
            >
              <View
                style={{
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: isActive ? palette.accentGlow : 'transparent',
                  shadowOpacity: isActive ? 1 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                  color={isActive ? palette.accent : T.inkMute}
                />
              </View>
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 10,
                    letterSpacing: 2.6,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? palette.accent : T.inkMute,
                  },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
