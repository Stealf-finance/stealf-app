import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { T } from '@/src/design-system/tokens';

const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 180;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is more accurate than `isConnected` on captive
      // portals / Wi-Fi without uplink. It can be null briefly at app start —
      // we treat null as connected to avoid a flash of false-positive banner.
      const isOnline =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!isOnline);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (offline) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTER_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTER_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: EXIT_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [offline, mounted, opacity, translateY]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          paddingTop: insets.top + 6,
          transform: [{ translateY }],
          opacity,
        },
      ]}
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
