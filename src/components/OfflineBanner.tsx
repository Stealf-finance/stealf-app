import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';

const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 180;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is more accurate than `isConnected` on captive
      // portals / Wi-Fi without uplink. It can be null briefly at app start —
      // we treat null as connected to avoid a flash of false-positive banner.
      const isOnline =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!isOnline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const duration = offline ? ENTER_DURATION_MS : EXIT_DURATION_MS;
    translateY.set(withTiming(offline ? 0 : -60, { duration }));
    opacity.set(withTiming(offline ? 1 : 0, { duration }));
  }, [offline, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    opacity: opacity.get(),
  }));

  // Always mounted: the banner sits offscreen and transparent until `offline`
  // flips, so the exit animation plays out without a mount/unmount state flag
  // driving an extra render.
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { paddingTop: insets.top + 6 }, animatedStyle]}
    >
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.text}>You&apos;re offline</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.bgRaised2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.hairlineStrong,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.error,
    marginRight: 8,
  },
  text: {
    color: T.ink,
    fontFamily: 'Sansation_400Regular',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
