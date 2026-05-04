import { useState } from 'react';
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

const REGISTRATION_COST_SOL = 0.012;

type Props = {
  /** Called when the user taps the "Go back" CTA in the insufficient state. */
  onClose?: () => void;
};

/**
 * Full-screen overlay shown over private-balance flows when either of the
 * user's wallets (stealth or bank) hasn't been registered with the Umbra
 * protocol yet. Registering both is the prerequisite for every private
 * operation in the app, so we register both in a single click.
 */
export function StealthSetupOverlay({ onClose }: Props) {
  const { user } = useAuth();
  const stealfWallet = user?.stealfWallet ?? null;
  const bankWallet = user?.bankWallet ?? null;

  const { data: stealthRegistered, isLoading: stealthChecking } =
    useUmbraRegistration(stealfWallet);
  const { data: bankRegistered, isLoading: bankChecking } =
    useUmbraRegistration(bankWallet);

  const { data: stealthBalanceData } = useBalance(stealfWallet);
  const { data: bankBalanceData } = useBalance(bankWallet);

  const stealthSol =
    stealthBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ??
    0;
  const bankSol =
    bankBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;

  const needStealthRegistration = stealthRegistered === false;
  const needBankRegistration = bankRegistered === false;

  // Insufficient if any of the wallets that still need registration doesn't
  // have enough SOL to cover its own protocol fee. A wallet that's already
  // registered doesn't need any SOL — it just sits.
  const stealthShort =
    needStealthRegistration && stealthSol < REGISTRATION_COST_SOL;
  const bankShort = needBankRegistration && bankSol < REGISTRATION_COST_SOL;
  const insufficient = stealthShort || bankShort;

  const [registering, setRegistering] = useState(false);
  const { register, getBankClient } = useUmbra();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  // Hide while we don't know yet (avoids the card flashing on screens where
  // both wallets are already registered) or no stealth wallet at all.
  if (!stealfWallet) return null;
  if (stealthChecking || bankChecking) return null;
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
