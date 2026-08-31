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
import { KeyCard, type RevealState } from '../components/KeyCard';
import { WarningBanner } from '../components/WarningBanner';
import { DangerConfirmSheet } from '../components/DangerConfirmSheet';

const S = txPalette('silver');

export function PrivateKeyScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { exportWallet, wallets } = useTurnkey();

  const bankAddress = user?.bankWallet ?? null;
  const bankWalletId = wallets?.[0]?.walletId ?? null;

  const [bank, setBank] = useState<RevealState>({ phase: 'idle' });
  const [confirming, setConfirming] = useState(false);

  const askBank = () => setConfirming(true);
  const cancelConfirm = () => setConfirming(false);
  const onConfirmExport = () => {
    setConfirming(false);
    void revealBank();
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
      </ScrollView>

      <DangerConfirmSheet
        visible={confirming}
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

    </CenterGlow>
  );
}
