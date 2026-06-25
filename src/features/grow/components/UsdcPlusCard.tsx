/**
 * STLF (Reflect-backed) savings card — live balance + holder APY, with Buy / Sell.
 * STLF is Stealf's branded yield-bearing stablecoin (backed by Reflect USDC+).
 * Internal api fields keep the `usdcPlus*` names (backend contract); the UI shows
 * the brand "STLF".
 *
 * Wires the ported Reflect api/hooks into the Grow screen. Bank-wallet flow
 * only (Turnkey signing). Amount entry uses Alert.prompt (iOS); Android shows a
 * not-yet-available notice — a proper numpad sheet can replace this later.
 */
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mono, sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  useInvalidateUsdcYield,
  useUsdcYieldBalance,
  useUsdcYieldStats,
} from '../hooks/useUsdcYieldData';
import { useUsdcYield } from '../hooks/useUsdcYield';

const S = txPalette('silver');

function promptAmount(title: string, onSubmit: (amount: number) => void) {
  if (Platform.OS !== 'ios') {
    Alert.alert('Coming soon', 'Amount entry is available on iOS for now.');
    return;
  }
  Alert.prompt(
    title,
    'Enter amount in USDC (up to 6 decimals)',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: (raw?: string) => {
          const amount = Number((raw ?? '').replace(',', '.'));
          if (!Number.isFinite(amount) || amount <= 0) {
            Alert.alert('Invalid amount');
            return;
          }
          onSubmit(amount);
        },
      },
    ],
    'plain-text',
    '',
    'decimal-pad',
  );
}

export function UsdcPlusCard() {
  const { user } = useAuth();
  const wallet = user?.bankWallet;

  const { data: stats } = useUsdcYieldStats();
  const { data: balance, isLoading: balanceLoading } =
    useUsdcYieldBalance(wallet);
  const invalidate = useInvalidateUsdcYield();
  const { mint, burn, loading } = useUsdcYield('bank');

  const apy = stats?.calculatedApy;
  const uiAmount = balance?.usdcPlusUiAmount ?? 0;
  const usdValue = balance?.usdValue ?? 0;

  const handleMint = useCallback(() => {
    promptAmount('Buy STLF', async (amount) => {
      try {
        const res = await mint(amount);
        Alert.alert('Order sent', `Tx: ${res.signature.slice(0, 16)}…`);
        invalidate(wallet ?? undefined);
      } catch (err) {
        Alert.alert(
          'Buy failed',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    });
  }, [mint, invalidate, wallet]);

  const handleBurn = useCallback(() => {
    promptAmount('Sell STLF → USDC', async (amount) => {
      try {
        const res = await burn(amount);
        Alert.alert('Order sent', `Tx: ${res.signature.slice(0, 16)}…`);
        invalidate(wallet ?? undefined);
      } catch (err) {
        Alert.alert(
          'Sell failed',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    });
  }, [burn, invalidate, wallet]);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingVertical: 20, paddingHorizontal: 22 }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(38,116,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={[sansation, { fontSize: 18, color: '#4c8dff', fontWeight: '700' }]}
            >
              $+
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 16,
                color: S.ink,
                fontWeight: '500',
                letterSpacing: -0.16,
              }}
            >
              STLF
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}
            >
              <Text
                style={[mono, { fontSize: 12, color: S.inkFaint, letterSpacing: 0.24 }]}
              >
                {balance ? `${uiAmount.toFixed(2)} held` : '— held'}
              </Text>
              {balanceLoading && (
                <ActivityIndicator size="small" color={S.inkFaint} />
              )}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text
              style={[
                sansation,
                {
                  fontSize: 9,
                  letterSpacing: 1.98,
                  textTransform: 'uppercase',
                  color: S.inkFaint,
                  fontWeight: '600',
                },
              ]}
            >
              APY
            </Text>
            <Text
              style={[
                mono,
                {
                  fontSize: 16,
                  color: T.gold,
                  fontWeight: '600',
                  textShadowColor: T.goldGlow,
                  textShadowRadius: 8,
                  textShadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              {apy != null ? `${apy.toFixed(2)}%` : '—'}
            </Text>
          </View>
        </View>

        {usdValue > 0 && (
          <Text
            style={[
              mono,
              { fontSize: 11, color: S.inkFaint, marginTop: 10, letterSpacing: 0.2 },
            ]}
          >
            ≈ ${usdValue.toFixed(2)} USD
          </Text>
        )}

        {/* USDC+ / USDC conversion rate — surfaced as a stat card in front-stealf's
            saving-dashboard. Kept commented in case we want it back here.
        {stats?.rate != null && (
          <Text
            style={[
              mono,
              { fontSize: 11, color: S.inkFaint, marginTop: 4, letterSpacing: 0.2 },
            ]}
          >
            USDC+ / USDC · {stats.rate.toFixed(4)}
          </Text>
        )} */}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <ActionButton label="Buy" onPress={handleMint} disabled={loading} primary />
          <ActionButton label="Sell" onPress={handleBurn} disabled={loading} />
        </View>
      </LinearGradient>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: primary
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={[
          sansation,
          { fontSize: 13, color: S.ink, fontWeight: '600', letterSpacing: 0.2 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
