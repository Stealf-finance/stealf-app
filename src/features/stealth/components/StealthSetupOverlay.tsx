import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { InteractionManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountSetupCard } from '@/src/design-system/primitives/AccountSetupCard';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { LoaderOverlay } from '@/src/design-system/primitives/LoaderOverlay';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import {
  umbraRegistrationQueries,
  useUmbraRegistration,
} from '@/src/features/stealth/hooks/useUmbraRegistration';
import { ensureRegisteredFor } from '@/src/features/stealth/lib/registration';
import type { User } from '@/src/features/onboarding/types';

const REGISTRATION_COST_SOL = 0.012;

type Props = {
  onClose?: () => void;
};

export function StealthSetupOverlay({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const stealfWallet = user?.stealfWallet ?? null;
  const bankWallet = user?.bankWallet ?? null;

  const persistedStealth = user?.stealthRegistered;
  const persistedBank = user?.bankRegistered;
  const needsProbe =
    persistedStealth === undefined || persistedBank === undefined;

  const { data: probedStealth, isLoading: stealthChecking } =
    useUmbraRegistration(needsProbe ? stealfWallet : null);
  const { data: probedBank, isLoading: bankChecking } =
    useUmbraRegistration(needsProbe ? bankWallet : null);

  const stealthRegistered = persistedStealth ?? probedStealth;
  const bankRegistered = persistedBank ?? probedBank;

  // One-shot persist: when the chain probe resolves for a legacy user,
  // write the result onto the user object so we never have to probe again.
  useEffect(() => {
    if (!user) return;
    const updates: Partial<User> = {};
    if (persistedStealth === undefined && typeof probedStealth === 'boolean') {
      updates.stealthRegistered = probedStealth;
    }
    if (persistedBank === undefined && typeof probedBank === 'boolean') {
      updates.bankRegistered = probedBank;
    }
    if (Object.keys(updates).length > 0) {
      setUser({ ...user, ...updates });
    }
  }, [user, persistedStealth, persistedBank, probedStealth, probedBank, setUser]);

  const { data: stealthBalanceData, isLoading: stealthBalLoading } =
    useBalance(stealfWallet);
  const { data: bankBalanceData, isLoading: bankBalLoading } =
    useBalance(bankWallet);

  const stealthSol =
    stealthBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ??
    0;
  const bankSol =
    bankBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;

  const needStealthRegistration = stealthRegistered === false;
  const needBankRegistration = bankRegistered === false;

  const stealthShort =
    needStealthRegistration && stealthSol < REGISTRATION_COST_SOL;
  const bankShort = needBankRegistration && bankSol < REGISTRATION_COST_SOL;
  const insufficient = stealthShort || bankShort;

  const [registering, setRegistering] = useState(false);
  const { register, getBankClient } = useUmbra();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  const cancelledRef = useRef(false);
  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  if (!stealfWallet) return null;

  const regUnknown =
    (stealthChecking && stealthRegistered === undefined) ||
    (bankChecking && bankRegistered === undefined);
  const balanceUnknown =
    (stealthRegistered === false &&
      stealthBalLoading &&
      stealthBalanceData === undefined) ||
    (bankRegistered === false &&
      bankBalLoading &&
      bankBalanceData === undefined);
  if (regUnknown || balanceUnknown) {
    return (
      <LoaderOverlay
        tone="gold"
        label="Checking your private setup…"
        sub="Verifying registration with the privacy protocol."
      />
    );
  }

  if (!needStealthRegistration && !needBankRegistration) return null;

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

      if (needStealthRegistration) {
        await register();
      }
      if (cancelledRef.current) return;

      if (needBankRegistration) {
        const bankClient = await getBankClient();
        await ensureRegisteredFor(bankClient);
      }
      if (cancelledRef.current) return;

      if (user) {
        setUser({
          ...user,
          stealthRegistered: true,
          bankRegistered: true,
        });
      }

      await Promise.all([
        stealfWallet
          ? queryClient.invalidateQueries({
              queryKey: umbraRegistrationQueries.byAddress(stealfWallet),
            })
          : Promise.resolve(),
        bankWallet
          ? queryClient.invalidateQueries({
              queryKey: umbraRegistrationQueries.byAddress(bankWallet),
            })
          : Promise.resolve(),
      ]);
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
        {/* Back button — lets the user exit the setup card back to the
            stealth screen's public mode without registering. Hidden while
            the heavy ZK registration is running so the user can't cancel
            mid-proof. */}
        {!registering ? (
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
            }}
          >
            <BackBtn onPress={onClose} accessibilityLabel="Back to public" />
          </View>
        ) : null}
        <View style={{ width: '100%', maxWidth: 380 }}>
          <AccountSetupCard
            kind="stealth"
            insufficient={insufficient}
            onPress={handlePress}
            loading={registering}
          />
        </View>
      </BlurView>

      {registering ? (
        <LoaderOverlay
          tone="gold"
          label="Registering your accounts…"
          sub="Setting up your encrypted balance"
        />
      ) : null}
    </Animated.View>
  );
}
