import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { InteractionManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountSetupCard } from '@/src/design-system/primitives/AccountSetupCard';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { LoaderOverlay } from '@/src/design-system/primitives/LoaderOverlay';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useUmbra } from '@/src/features/umbra/hooks/useUmbra';
import {
  umbraRegistrationQueries,
  useUmbraRegistration,
} from '@/src/features/umbra/hooks/useUmbraRegistration';

const REGISTRATION_COST_SOL = 0.012;

type Props = {
  onClose?: () => void;
};

/**
 * Gates the privacy flows on the wallet being registered with Umbra. The
 * registration is a one-time on-chain ZK setup paid in SOL from the wallet
 * itself, so the card doubles as the "not enough SOL" state.
 *
 * Self-hiding: renders nothing once `bankRegistered` is true.
 */
export function UmbraSetupOverlay({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const wallet = user?.bankWallet ?? null;

  // Persisted flag first; the chain probe is the fallback for users onboarded
  // before the flag existed, and its result is written back once.
  const persisted = user?.bankRegistered;
  // `isPending`, not `isLoading`: the probe is now held disabled until the
  // Turnkey signer is installed, and a disabled query reports `isLoading:
  // false` with no data — which would read as "resolved, not registered" and
  // drop this overlay for a moment mid-hydration. `isPending` stays true
  // across both the disabled wait and the fetch itself.
  const { data: probed, isPending: checking } = useUmbraRegistration(
    persisted === undefined ? wallet : null,
  );
  const registered = persisted ?? probed;

  useEffect(() => {
    if (!user) return;
    if (persisted !== undefined || typeof probed !== 'boolean') return;
    setUser({ ...user, bankRegistered: probed });
  }, [user, persisted, probed, setUser]);

  const { data: balanceData, isLoading: balLoading } = useBalance(wallet);
  const sol =
    balanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;

  const needsRegistration = registered === false;
  const insufficient = needsRegistration && sol < REGISTRATION_COST_SOL;

  const [registering, setRegistering] = useState(false);
  const { register } = useUmbra();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  const cancelledRef = useRef(false);
  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  if (!wallet) return null;

  const regUnknown = checking && registered === undefined;
  const balanceUnknown =
    needsRegistration && balLoading && balanceData === undefined;
  if (regUnknown || balanceUnknown) {
    return (
      <LoaderOverlay
        tone="gold"
        label="Checking your private setup…"
        sub="Verifying registration with Umbra Privacy."
      />
    );
  }

  if (!needsRegistration) return null;

  const handlePress = async () => {
    if (insufficient) {
      onClose?.();
      return;
    }

    setRegistering(true);
    cancelledRef.current = false;
    try {
      await new Promise<void>((resolve) =>
        InteractionManager.runAfterInteractions(() => resolve()),
      );

      await register();
      if (cancelledRef.current) return;

      if (user) setUser({ ...user, bankRegistered: true });

      await queryClient.invalidateQueries({
        queryKey: umbraRegistrationQueries.byAddress(wallet),
      });
    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg =
        err?.userMessage ||
        err?.message ||
        'Registration failed. Try again in a moment.';
      showToast({ kind: 'error', title: 'Could not register', message: msg });
    } finally {
      if (!cancelledRef.current) setRegistering(false);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(220)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Sit above the wallet screen's FAB (zIndex 30) + bottom bar (20).
        zIndex: 50,
        elevation: 50,
      }}
    >
      <BlurView
        intensity={40}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={{
          flex: 1,
          backgroundColor: 'rgba(8,8,10,0.5)',
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Back button — lets the user leave the setup card without
            registering. Hidden while the heavy ZK registration is running so
            the user can't cancel mid-proof. */}
        {!registering ? (
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 24,
            }}
          >
            <GlassBackButton onPress={onClose} />
          </View>
        ) : null}
        <View style={{ width: '100%', maxWidth: 380 }}>
          <AccountSetupCard
            kind="privacy"
            insufficient={insufficient}
            onPress={handlePress}
            loading={registering}
          />
        </View>
      </BlurView>

      {registering ? (
        <LoaderOverlay
          tone="gold"
          label="Registering your wallet…"
          sub="Setting up your encrypted balance"
        />
      ) : null}
    </Animated.View>
  );
}
