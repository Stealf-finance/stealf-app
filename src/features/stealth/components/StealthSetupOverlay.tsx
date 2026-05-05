import { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { AccountSetupCard } from '@/src/design-system/primitives/AccountSetupCard';
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

/**
 * Full-screen overlay shown over private-balance flows when either of the
 * user's wallets (stealth or bank) hasn't been registered with the Umbra
 * protocol yet. Registering both is the prerequisite for every private
 * operation in the app, so we register both in a single click.
 */
export function StealthSetupOverlay({ onClose }: Props) {
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
    try {
      // Register sequentially so each transaction sees a clean blockhash and
      // we don't race two activities on the same RPC. `ensureRegistered` is
      // idempotent so already-registered wallets are no-ops.
      if (needStealthRegistration) {
        await register();
      }
      if (needBankRegistration) {
        const bankClient = await getBankClient();
        await ensureRegisteredFor(bankClient);
      }

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
      const msg =
        err?.userMessage ||
        err?.message ||
        'Registration failed. Try again in a moment.';
      showToast({ kind: 'error', title: 'Could not register', message: msg });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(220)}
      pointerEvents="auto"
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
          sub="Submitting transactions to the privacy protocol."
        />
      ) : null}
    </Animated.View>
  );
}
