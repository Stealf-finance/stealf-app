import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useDeleteStealthWallet } from '@/src/features/stealth/hooks/useDeleteStealthWallet';
import { useToast } from '@/src/components/toast/ToastContext';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { KeyCard, type RevealState } from '../components/KeyCard';
import { WarningBanner } from '../components/WarningBanner';
import { DangerConfirmSheet } from '../components/DangerConfirmSheet';

const S = txPalette('silver');
const G = txPalette('gold');

type WalletKind = 'bank' | 'stealth';

export function PrivateKeyScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { exportWallet, wallets } = useTurnkey();

  const bankAddress = user?.bankWallet ?? null;
  const stealthAddress = user?.stealfWallet ?? null;
  const bankWalletId = wallets?.[0]?.walletId ?? null;

  const [bank, setBank] = useState<RevealState>({ phase: 'idle' });
  const [stealth, setStealth] = useState<RevealState>({ phase: 'idle' });
  const [confirmingFor, setConfirmingFor] = useState<WalletKind | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const deleteStealthWallet = useDeleteStealthWallet();
  const { show: showToast } = useToast();

  const askDeleteStealth = () => setConfirmingDelete(true);
  const cancelDelete = () => setConfirmingDelete(false);
  const onConfirmDelete = async () => {
    setConfirmingDelete(false);
    try {
      await deleteStealthWallet.mutateAsync();
      setStealth({ phase: 'idle' });
      showToast({
        kind: 'success',
        title: 'Wallet deleted',
        message: 'Re-create or import one from the Payment tab.',
      });
      router.back();
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: "Couldn't delete",
        message: err?.message || 'Try again in a moment.',
      });
    }
  };

  const askBank = () => setConfirmingFor('bank');
  const askStealth = () => setConfirmingFor('stealth');
  const cancelConfirm = () => setConfirmingFor(null);
  const onConfirmExport = () => {
    const target = confirmingFor;
    setConfirmingFor(null);
    if (target === 'bank') void revealBank();
    else if (target === 'stealth') void revealStealth();
  };

  const revealBank = async () => {
    if (!bankWalletId) {
      setBank({ phase: 'error', message: 'Virtual bank account not set up.' });
      return;
    }
    setBank({ phase: 'loading' });
    try {
      const mnemonic = await exportWallet({ walletId: bankWalletId });
      const value = typeof mnemonic === 'string' ? mnemonic : String(mnemonic);
      setBank({ phase: 'ready', value });
    } catch (err: any) {
      const cause = err?.cause;
      const msg = cause?.message || err?.message || 'Export failed.';
      if (__DEV__) {
        console.warn('[PrivateKey] bank export failed', {
          message: err?.message,
          code: err?.code,
          causeMessage: cause?.message,
          causeStatus: cause?.statusCode,
          causeCode: cause?.code,
        });
      }
      setBank({ phase: 'error', message: msg });
    }
  };

  const revealStealth = async () => {
    setStealth({ phase: 'loading' });
    try {
      const mnemonic = await walletKeyCache.getMnemonicPersisted();
      if (!mnemonic) {
        setStealth({
          phase: 'error',
          message: 'Recovery phrase unavailable. Set up the wallet first.',
        });
        return;
      }
      setStealth({ phase: 'ready', value: mnemonic });
    } catch (err: any) {
      setStealth({
        phase: 'error',
        message: err?.message || 'Could not load recovery phrase.',
      });
    }
  };

  return (
    <CenterGlow tone="silver" flat>
      {/* Header — pattern archetype: bare chevron + centered 22pt title */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 22,
                lineHeight: 28,
                fontWeight: '600',
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            Private key
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <WarningBanner />

        <KeyCard
          title="Virtual bank account"
          accent={S.accent}
          address={bankAddress}
          state={bank}
          onAsk={askBank}
          onRetry={revealBank}
        />

        <KeyCard
          title="Wallet"
          accent={G.accent}
          address={stealthAddress}
          state={stealth}
          onAsk={askStealth}
          onRetry={revealStealth}
          onDelete={stealthAddress ? askDeleteStealth : undefined}
        />
      </ScrollView>

      <DangerConfirmSheet
        visible={confirmingFor !== null}
        iconKey="shieldOff"
        title="Keep your private key secret"
        bullets={[
          {
            iconKey: 'key',
            text: 'Your private key is the master key to your wallet.',
          },
          {
            iconKey: 'hideEye',
            text: 'If someone gets it, they can drain your funds. Lost funds cannot be recovered.',
          },
          {
            iconKey: 'info',
            text: 'Never share it. Not with anyone, not on any website or app.',
          },
        ]}
        checkboxLabel="I understand that sharing my private key could lead to permanent loss of funds."
        ctaLabel="Continue"
        onConfirm={onConfirmExport}
        onCancel={cancelConfirm}
      />

      <DangerConfirmSheet
        visible={confirmingDelete}
        iconKey="trash"
        title="Delete wallet?"
        destructive
        busy={deleteStealthWallet.isPending}
        busyLabel="Deleting…"
        bullets={[
          {
            iconKey: 'shieldOff',
            text: 'This wipes the local key and recovery phrase from this device.',
          },
          {
            iconKey: 'hideEye',
            text: 'Your encrypted balance stays on-chain but becomes unreachable without your recovery phrase.',
          },
          {
            iconKey: 'info',
            text: 'Your virtual bank account stays untouched.',
          },
        ]}
        checkboxLabel="I have saved my recovery phrase and understand my encrypted balance will be unreachable without it."
        ctaLabel="Delete wallet"
        onConfirm={onConfirmDelete}
        onCancel={cancelDelete}
      />
    </CenterGlow>
  );
}
