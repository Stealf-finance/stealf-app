import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useToast } from '@/src/components/toast/ToastContext';

const FAB_SIZE = 60;

export type QuickAction = {
  key: string;
  label: string;
  iconKey: keyof typeof Icons;
  /** Route to push; omitted → "coming soon" toast. */
  route?: string;
};

// Home default: top-to-bottom order; the list stacks upward from the FAB.
const DEFAULT_ACTIONS: QuickAction[] = [
  { key: 'send', label: 'Send', iconKey: 'arrUpRight', route: '/send-choice' },
  { key: 'receive', label: 'Receive', iconKey: 'arrDownLeft', route: '/receive-choice' },
  { key: 'move', label: 'Move', iconKey: 'moove', route: '/moove' },
  { key: 'buy', label: 'Buy', iconKey: 'dollar' }, // not built yet
];

/**
 * Floating "+" FAB (bottom-right, gold) that expands into a speed-dial of
 * actions over a blurred backdrop. Defaults to the home quick actions; pass
 * `actions` for a per-screen menu.
 */
export function QuickActionMenu({
  actions = DEFAULT_ACTIONS,
}: {
  actions?: QuickAction[];
} = {}) {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, p]);

  const fabBottom = insets.bottom + 8;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  // FAB fades + scales away as the menu opens.
  const fabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [1, 0.6]) }],
  }));

  const onAction = (a: QuickAction) => {
    setOpen(false);
    if (a.route) router.push(a.route as never);
    else show({ kind: 'info', title: 'Coming soon', message: `${a.label} is coming soon.` });
  };

  return (
    <>
      {/* Overlay: blurred/dimmed backdrop + the action list. Always mounted so
          it fades both in and out; the heavy BlurView only renders while open. */}
      {open ? (
        <Animated.View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, backdropStyle, { zIndex: 25 }]}
        >
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,10,0.35)' }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />

          <View
            style={{
              position: 'absolute',
              right: 24,
              bottom: fabBottom + FAB_SIZE + 20,
              alignItems: 'flex-end',
              gap: 22,
            }}
          >
            {actions.map((a, i) => (
              <ActionRow key={a.key} action={a} index={i} p={p} onPress={() => onAction(a)} />
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* FAB — fades/scales out while the menu is open (closing is via the
          backdrop). The Animated.View carries an explicit size so it doesn't
          collapse; the Pressable fills it. */}
      <Animated.View
        pointerEvents={open ? 'none' : 'auto'}
        style={[
          {
            position: 'absolute',
            right: 24,
            bottom: fabBottom,
            zIndex: 30,
            width: FAB_SIZE,
            height: FAB_SIZE,
            // Silver glow, matching the primary (Continue) pill. The shadow
            // lives here because the Pressable clips to a circle below.
            borderRadius: FAB_SIZE / 2,
            shadowColor: 'rgba(220,220,225,0.5)',
            shadowOpacity: 0.5,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
          },
          fabStyle,
        ]}
      >
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel="Open actions"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: FAB_SIZE / 2,
            overflow: 'hidden',
          }}
        >
          {/* Same silver gradient as PillBtn's primary variant. */}
          <LinearGradient
            colors={['#e8e8ea', '#9a9a9f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icons.plus size={26} strokeWidth={2.4} color="#0a0a0a" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );
}

function ActionRow({
  action,
  index,
  p,
  onPress,
}: {
  action: QuickAction;
  index: number;
  p: SharedValue<number>;
  onPress: () => void;
}) {
  const Icon = Icons[action.iconKey];
  const style = useAnimatedStyle(() => {
    // Staggered reveal: later items start slightly later.
    const t = interpolate(
      p.value,
      [index * 0.06, index * 0.06 + 0.5],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: t, transform: [{ translateY: interpolate(t, [0, 1], [16, 0]) }] };
  });

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <Text style={[sansation, { fontSize: 18, color: T.ink }]}>{action.label}</Text>
        <Icon size={24} strokeWidth={2} color={T.ink} />
      </Pressable>
    </Animated.View>
  );
}
