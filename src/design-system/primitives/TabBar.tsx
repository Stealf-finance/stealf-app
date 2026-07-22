import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { Icons } from '@/src/design-system/icons';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

export type TabId = 'bank' | 'history' | 'profile';

type Props = {
  active: TabId;
  onTab: (id: TabId) => void;
  tone?: Tone;
};

// `id` stays internal (route segment); only the icon is UI — this bar is
// icon-only (labels dropped). Grow / Payment were removed from the bar.
const TABS: { id: TabId; iconKey: keyof typeof Icons; label: string }[] = [
  { id: 'bank', iconKey: 'tabHome', label: 'Home' },
  { id: 'history', iconKey: 'clock', label: 'History' },
  { id: 'profile', iconKey: 'tabProfile', label: 'Profile' },
];

/**
 * Floating pill nav (bottom-left): a glass capsule holding icon-only tabs.
 * The active tab gets a rounded accent-tinted highlight; the paired "+" FAB
 * (QuickActionMenu) sits separately bottom-right.
 */
export function TabBar({ active, onTab, tone = 'silver' }: Props) {
  const palette = txPalette(tone);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ position: 'absolute', left: 24, bottom: insets.bottom + 8 }}>
      <BlurGlass
        radius={36}
        innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }}
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
                width: 54,
                height: 46,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive ? palette.accentSoft : 'transparent',
              }}
            >
              <Icon
                size={26}
                strokeWidth={2}
                color={isActive ? palette.accent : T.inkMute}
              />
            </Pressable>
          );
        })}
      </BlurGlass>
    </View>
  );
}
