import { Pressable, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Tone, txPalette } from '@/src/design-system/palettes';

export type MoveAccount = 'bank' | 'stealth' | 'encrypted';

/** Same account imagery as the Home grid cards. */
export const ACCOUNT_IMAGE: Record<MoveAccount, number> = {
  bank: require('@/assets/images/coin.png'),
  stealth: require('@/assets/images/wallet.png'),
  encrypted: require('@/assets/images/shield.png'),
};

const TAG_STYLE = { fontSize: 12, letterSpacing: 2.2 };

/** Bare account icon — top-right of each card. */
function AccountIcon({ account }: { account: MoveAccount }) {
  return (
    <Image
      source={ACCOUNT_IMAGE[account]}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{ width: 34, height: 34 }}
    />
  );
}

/** Bold balance + small USD suffix, bottom line of both cards. */
function BalanceLine({ balance }: { balance: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Text
        numberOfLines={1}
        style={[
          sansation,
          {
            fontSize: 17,
            fontWeight: '700',
            color: T.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {balance}
      </Text>
      <Text
        style={[
          sansation,
          {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.8,
            color: T.inkFaint,
            includeFontPadding: false,
          },
        ]}
      >
        USD
      </Text>
    </View>
  );
}

type Props = {
  fromAccount: MoveAccount;
  toAccount: MoveAccount;
  fromLabel: string;
  toLabel: string;
  toBalance: string;
  /** Opens the source-account picker (the direction derives from it). */
  onPressFrom: () => void;
  tone?: Tone;
  /** Asset line inside the From card (merged, reference layout). */
  assetIconSource: ImageSource | number;
  assetBalanceLabel: string;
  onPressSelectAsset?: () => void;
  onPressMax?: () => void;
};

/** Reference-style From → To pair. The From card is the tall hero card:
 *  FROM + account icon up top, the selected asset line and the USD balance
 *  down low (the old asset row is merged in). The To card mirrors the
 *  anatomy. Tap From → source picker; tap the asset line → asset picker. */
export function MoveAccountCards({
  fromAccount,
  toAccount,
  fromLabel,
  toLabel,
  toBalance,
  onPressFrom,
  tone = 'silver',
  assetIconSource,
  assetBalanceLabel,
  onPressSelectAsset,
  onPressMax,
}: Props) {
  const palette = txPalette(tone);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
      {/* Both halves share the SAME static wrapper so widths stay equal
          (layout flex on static styles — Pressable style-fns don't stretch). */}
      <Pressable
        onPress={onPressFrom}
        accessibilityRole="button"
        accessibilityLabel="Change source account"
        style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row' }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 14,
            backgroundColor: palette.accentSoft,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Kicker color={T.ink} style={TAG_STYLE}>
              From
            </Kicker>
            <AccountIcon account={fromAccount} />
          </View>

          {/* Fixed gap — content-driven height so the pair never overflows
              into the keypad on small screens. */}
          <View style={{ height: 14 }} />

          {/* Account name */}
          <Text
            numberOfLines={1}
            style={[
              sansation,
              {
                fontSize: 12,
                color: T.inkDim,
                includeFontPadding: false,
              },
            ]}
          >
            {fromLabel}
          </Text>

          {/* Asset line — tap to change the asset; Use Max on the right */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={onPressSelectAsset}
                disabled={!onPressSelectAsset}
                accessibilityRole={onPressSelectAsset ? 'button' : undefined}
                accessibilityLabel={
                  onPressSelectAsset ? 'Select asset' : undefined
                }
                hitSlop={6}
                style={({ pressed }) => ({
                  opacity: pressed && onPressSelectAsset ? 0.7 : 1,
                })}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  {onPressSelectAsset ? (
                    <Icons.chevD size={12} color={T.inkDim} strokeWidth={2} />
                  ) : null}
                  <Image
                    source={assetIconSource}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    style={{ width: 16, height: 16, borderRadius: 8 }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      sansation,
                      {
                        flexShrink: 1,
                        fontSize: 12,
                        color: T.inkDim,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {assetBalanceLabel}
                  </Text>
                </View>
              </Pressable>
            </View>
            {onPressMax ? (
              <Pressable
                onPress={onPressMax}
                accessibilityRole="button"
                accessibilityLabel="Use max balance"
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View
                  style={{
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 11,
                        fontWeight: '600',
                        color: T.ink,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    Max
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* To — same anatomy, derived, plain glass */}
      <View
        style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row' }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 14,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Kicker color={T.ink} style={TAG_STYLE}>
              To
            </Kicker>
            <AccountIcon account={toAccount} />
          </View>

          <View style={{ flex: 1 }} />

          <Text
            numberOfLines={1}
            style={[
              sansation,
              {
                fontSize: 12,
                color: T.inkDim,
                includeFontPadding: false,
              },
            ]}
          >
            {toLabel}
          </Text>
          <View style={{ marginTop: 8 }}>
            <BalanceLine balance={toBalance} />
          </View>
        </View>
      </View>
    </View>
  );
}
