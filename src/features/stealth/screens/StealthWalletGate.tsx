// src/features/stealth/screens/StealthWalletGate.tsx
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ProgressOverlay } from '@/src/design-system/primitives/ProgressOverlay';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useRegisterStealfWallet } from '@/src/features/stealth/hooks/useRegisterStealfWallet';
import { usePrefetchWalletData } from '@/src/features/bank/hooks/usePrefetchWalletData';
import { useSetupStealfWallet } from '@/src/features/stealth/hooks/useSetupStealfWallet';
import {
  StealfWalletSetup,
  type SetupChoice,
} from '@/src/features/stealth/screens/StealfWalletSetup';
import {
  decideSyncAction,
  runSyncScan,
} from '@/src/features/stealth/lib/syncStealfWallet';
import { socketService } from '@/src/services/real-time/socket';
import { useToast } from '@/src/components/toast/ToastContext';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { umbraRegistrationQueries } from '@/src/features/stealth/hooks/useUmbraRegistration';
import type { BalanceResponse, HistoryResponse } from '@/src/features/bank/types';

/**
 * Gates the Payment tab on a stealth wallet existing. With no wallet it
 * renders the create/import setup screen and owns the post-setup persist +
 * claim-scan flow (lifted from StealthHub). Once a wallet exists it renders
 * its children (the Pay hub), with the sync overlay on top while scanning.
 */
export function StealthWalletGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, session, setUser } = useAuth();
  const sessionToken = session?.sessionToken ?? null;
  const { mutateAsync: registerWallet } = useRegisterStealfWallet();
  const prefetchWalletData = usePrefetchWalletData();
  const setup = useSetupStealfWallet();
  const { show: showToast } = useToast();

  const stealfWallet = user?.stealfWallet ?? null;

  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  const persistStealfWallet = async (
    walletAddress: string,
    isFresh: boolean,
  ) => {
    if (!sessionToken || !user) {
      showToast({
        kind: 'error',
        title: 'Not signed in',
        message: 'Please sign in again before continuing.',
      });
      return;
    }
    setRegistering(true);
    try {
      await registerWallet({ sessionToken, walletAddress });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to register wallet';
      if (__DEV__) console.warn('[StealthWalletGate] register failed:', msg);
      showToast({ kind: 'error', title: 'Could not save wallet', message: msg });
      setRegistering(false);
      return;
    }

    socketService.subscribeToWallet(walletAddress);

    if (isFresh) {
      const emptyBalance: BalanceResponse = {
        address: walletAddress,
        tokens: [],
        totalUSD: 0,
      };
      const emptyHistory: HistoryResponse = {
        address: walletAddress,
        count: 0,
        transactions: [],
      };
      queryClient.setQueryData(
        balanceQueries.byAddress(walletAddress),
        emptyBalance,
      );
      queryClient.setQueryData(
        historyQueries.byAddress(walletAddress),
        emptyHistory,
      );
      queryClient.setQueryData(
        umbraRegistrationQueries.byAddress(walletAddress),
        false,
      );
      if (user?.bankWallet && user?.bankRegistered === undefined) {
        queryClient.setQueryData(
          umbraRegistrationQueries.byAddress(user.bankWallet),
          false,
        );
      }
    } else {
      prefetchWalletData(sessionToken, walletAddress);
    }

    setUser({
      ...user,
      stealfWallet: walletAddress,
      ...(isFresh ? { stealthRegistered: false } : {}),
      ...(user.bankRegistered === undefined ? { bankRegistered: false } : {}),
    });
    setRegistering(false);

    try {
      const decision = await decideSyncAction(walletAddress, isFresh);
      if (decision.action === 'scan') {
        setSyncProgress(0);
        try {
          await runSyncScan(queryClient, walletAddress, {
            onProgress: (ratio) => setSyncProgress(ratio),
          });
        } catch (err) {
          if (__DEV__)
            console.warn('[StealthWalletGate] sync scan failed (continuing):', err);
        } finally {
          setSyncProgress(null);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[StealthWalletGate] sync decision threw:', err);
    }
  };

  const handleSetupComplete = async (choice: SetupChoice) => {
    if (choice.mode === 'create') {
      if (pendingMnemonic && pendingAddress) {
        await persistStealfWallet(pendingAddress, true);
        setPendingMnemonic(null);
        setPendingAddress(null);
        return;
      }
      const result = await setup.createWallet();
      if (!result.success || !result.walletAddress || !result.mnemonic) {
        showToast({
          kind: 'error',
          title: 'Could not create wallet',
          message: result.error ?? 'Unknown error',
        });
        return;
      }
      setPendingAddress(result.walletAddress);
      setPendingMnemonic(result.mnemonic);
      return;
    }

    if (choice.mode === 'import') {
      const result = await setup.importWallet(choice.mnemonic);
      if (!result.success || !result.walletAddress) {
        showToast({
          kind: 'error',
          title: 'Could not import wallet',
          message: result.error ?? 'Unknown error',
        });
        return;
      }
      await persistStealfWallet(result.walletAddress, false);
    }
  };

  const cancelSetup = () => {
    setPendingMnemonic(null);
    setPendingAddress(null);
  };

  if (!stealfWallet) {
    return (
      <StealfWalletSetup
        onComplete={handleSetupComplete}
        onCancel={cancelSetup}
        loading={setup.loading || registering}
        generatedMnemonic={pendingMnemonic ?? undefined}
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
