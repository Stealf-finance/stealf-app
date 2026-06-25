/**
 * BuyWithCard — fiat on-ramp entry for the bank wallet.
 *
 * Lets the user pick an asset (USDC / SOL) and a provider (MoonPay / Coinbase),
 * then opens the Turnkey-hosted on-ramp widget for that combination. Fiat
 * currency is left to the widget so every currency the provider supports in the
 * user's region is available. Credits the bank wallet only.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  FiatOnRampCryptoCurrency,
  FiatOnRampProvider,
} from '@turnkey/sdk-types';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useFiatOnRamp } from '../hooks/useFiatOnRamp';

type Asset = 'USDC' | 'SOL';

const ASSETS: Asset[] = ['USDC', 'SOL'];
const CRYPTO: Record<Asset, FiatOnRampCryptoCurrency> = {
  USDC: FiatOnRampCryptoCurrency.USDC,
  SOL: FiatOnRampCryptoCurrency.SOLANA,
};
const PROVIDERS: { key: FiatOnRampProvider; label: string }[] = [
  { key: FiatOnRampProvider.MOONPAY, label: 'MoonPay' },
  { key: FiatOnRampProvider.COINBASE, label: 'Coinbase' },
];

export function BuyWithCard({ walletAddress }: { walletAddress: string }) {
  const [asset, setAsset] = useState<Asset>('USDC');
  const onramp = useFiatOnRamp();
  const busy = onramp.status === 'initiating' || onramp.status === 'awaiting';

  const statusLabel =
    onramp.status === 'initiating'
      ? 'Opening…'
      : onramp.status === 'awaiting'
        ? 'Finish in your browser…'
        : onramp.status === 'completed'
          ? 'Funds added'
          : onramp.status === 'failed'
            ? (onramp.error ?? 'Purchase failed')
            : onramp.status === 'cancelled'
              ? 'Purchase cancelled'
              : null;
  const statusColor =
    onramp.status === 'completed'
      ? '#3AAA5A'
      : onramp.status === 'failed'
        ? '#E5484D'
        : T.inkFaint;

  const buy = (provider: FiatOnRampProvider) => {
    if (busy || !walletAddress) return;
    onramp
      .addFunds({ walletAddress, provider, crypto: CRYPTO[asset] })
      .catch(() => {
        // error surfaced via onramp.status / onramp.error
      });
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 12 }}>
      {/* Asset toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'center',
          padding: 4,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: T.hairline,
          gap: 4,
        }}
      >
        {ASSETS.map((a) => {
          const active = a === asset;
          return (
            <Pressable
              key={a}
              onPress={() => setAsset(a)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 18,
                borderRadius: 100,
                backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    color: active ? T.ink : T.inkFaint,
                  },
                ]}
              >
                {a}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Provider buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {PROVIDERS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => buy(p.key)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Buy ${asset} with ${p.label}`}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: T.hairline,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={T.ink} />
            ) : (
              <Icons.plus size={14} color={T.ink} />
            )}
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color: T.ink,
                },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Status line */}
      {statusLabel ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {onramp.status === 'completed' ? (
            <Icons.check size={12} color="#3AAA5A" strokeWidth={2.4} />
          ) : onramp.status === 'failed' ? (
            <Icons.info size={12} color="#E5484D" />
          ) : null}
          <Text
            style={[
              sansation,
              { fontSize: 11, fontWeight: '600', color: statusColor },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
