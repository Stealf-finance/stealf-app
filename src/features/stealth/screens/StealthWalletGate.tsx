// src/features/stealth/screens/StealthWalletGate.tsx
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { ProgressOverlay } from '@/src/design-system/primitives/ProgressOverlay';
import { useStealfWalletSetupFlow } from '@/src/features/stealth/hooks/useStealfWalletSetupFlow';
import { StealfWalletSetup } from '@/src/features/stealth/screens/StealfWalletSetup';

/**
 * Gates a stealth-wallet-dependent flow (private/simple transfer, move) on a
 * stealth wallet existing. With no wallet it renders the create/import setup
 * screen; once a wallet exists it renders its children, with the sync overlay
 * on top while scanning. The setup orchestration lives in
 * `useStealfWalletSetupFlow` (shared with the Home takeover).
 *
 * `onExit` (optional) shows a back button on the setup's choose step — pass
 * `router.back()` when the gate wraps a pushed/modal route so the user can
 * leave without creating a wallet.
 */
export function StealthWalletGate({
  children,
  onExit,
}: {
  children: ReactNode;
  onExit?: () => void;
}) {
  const {
    stealfWallet,
    loading,
    pendingMnemonic,
    syncProgress,
    handleSetupComplete,
    cancelSetup,
  } = useStealfWalletSetupFlow();

  if (!stealfWallet) {
    return (
      <StealfWalletSetup
        onComplete={handleSetupComplete}
        onCancel={cancelSetup}
        loading={loading}
        generatedMnemonic={pendingMnemonic ?? undefined}
        onExit={onExit}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {syncProgress !== null ? (
        <ProgressOverlay
          tone="gold"
          label="Syncing your wallet"
          sub="Setup can take up to a minute. Sit tight — we're scanning the privacy pool for any encrypted balance tied to your wallet."
          progress={syncProgress}
        />
      ) : null}
    </View>
  );
}
