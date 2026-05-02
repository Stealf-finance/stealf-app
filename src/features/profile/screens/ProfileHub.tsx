import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useShieldedSolBalance } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';

const S = txPalette('silver');

const PREFERENCES: { iconKey: keyof typeof Icons; label: string }[] = [
  { iconKey: 'key', label: 'Security & passkeys' },
  { iconKey: 'bell', label: 'Notifications' },
  { iconKey: 'card', label: 'Cards & limits' },
  { iconKey: 'settings', label: 'Preferences' },
];

function splitUsd(usd: number): { whole: string; cents: string } {
  const safe = Math.max(0, usd);
  const fixed = safe.toFixed(2);
  const [w, c] = fixed.split('.');
  const whole = `$${Number(w).toLocaleString('en-US')}`;
  return { whole, cents: `.${c}` };
}

function formatUsdShort(usd: number): string {
  const safe = Math.max(0, usd);
  if (safe >= 1000) return `$${Math.round(safe).toLocaleString('en-US')}`;
  return `$${safe.toFixed(2)}`;
}

export function ProfileHub() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: bankBalance } = useBalance(user?.bankWallet ?? null);
  const { data: stealthBalance } = useBalance(user?.stealfWallet ?? null);
  const { data: shielded } = useShieldedSolBalance();
  const { data: solPrice } = useSolPrice();

  const bankUSD = bankBalance?.totalUSD ?? 0;
  const stealthPublicUSD = stealthBalance?.totalUSD ?? 0;
  const privateUSD =
    typeof solPrice === 'number' && shielded ? shielded.sol * solPrice : 0;

  const publicUSD = bankUSD + stealthPublicUSD;
  const totalUSD = publicUSD + privateUSD;
  const { whole: totalWhole, cents: totalCents } = splitUsd(totalUSD);
  const publicPct = totalUSD > 0 ? publicUSD / totalUSD : 0;

  const username = user?.username ?? '';
  const avatarLetter = (username[0] ?? '·').toUpperCase();
  const points = user?.points ?? 0;

  return (
    <TonalBackground tone="silver">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar with concentric rings */}
        <View
          style={{
            width: 240,
            height: 200,
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          {[220, 180, 140].map((d, i) => (
            <View
              key={d}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                opacity: 1 - i * 0.2,
              }}
            />
          ))}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <LinearGradient
              colors={['rgba(30,30,34,0.95)', 'rgba(14,14,18,0.98)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 44,
                  lineHeight: 48,
                  color: S.accent,
                  includeFontPadding: false,
                },
              ]}
            >
              {avatarLetter}
            </Text>
          </View>
        </View>

        {/* Name + handle */}
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <Text
            style={[
              serif,
              {
                fontStyle: 'italic',
                fontSize: 30,
                lineHeight: 33,
                color: S.ink,
                marginBottom: 6,
              },
            ]}
          >
            {username || '—'}
          </Text>
          {username ? (
            <Text
              style={{ fontSize: 12, color: S.inkDim, letterSpacing: 0.2 }}
            >
              @{username}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: S.hairline,
            marginBottom: 22,
          }}
        />

        {/* Capital summary kicker */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 3.2,
                textTransform: 'uppercase',
                color: T.gold,
                fontWeight: '700',
              },
            ]}
          >
            Capital Summary
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.8,
                textTransform: 'uppercase',
                color: S.inkFaint,
                fontWeight: '500',
              },
            ]}
          >
            USD
          </Text>
        </View>

        {/* Total balance */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            marginBottom: 22,
          }}
        >
          <Text
            style={[
              sansationLight,
              {
                fontSize: 44,
                letterSpacing: -1.32,
                color: S.ink,
                lineHeight: 44,
                includeFontPadding: false,
              },
            ]}
          >
            {totalWhole}
          </Text>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 22,
                color: S.inkFaint,
                letterSpacing: -0.44,
                lineHeight: 22,
                includeFontPadding: false,
              },
            ]}
          >
            {totalCents}
          </Text>
        </View>

        {/* Public/Private split bar — degenerate to a single tone when one
            side is zero so we don't render an invisible 0%-wide segment. */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.05)',
            flexDirection: 'row',
            marginBottom: 12,
          }}
        >
          {totalUSD === 0 ? null : (
            <>
              <View
                style={{
                  width: `${publicPct * 100}%`,
                  backgroundColor: S.accent,
                }}
              />
              <View style={{ flex: 1, backgroundColor: T.gold }} />
            </>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 2,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: S.accent,
                }}
              />
              <Text style={{ fontSize: 11, color: S.inkDim }}>Public</Text>
            </View>
            <Text style={{ fontSize: 15, color: S.ink }}>
              {formatUsdShort(publicUSD)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: S.inkDim }}>Private</Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: T.gold,
                }}
              />
            </View>
            <Text style={{ fontSize: 15, color: T.gold }}>
              {formatUsdShort(privateUSD)}
            </Text>
          </View>
        </View>

        {/* Points + Tier */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <StatCard label="Points">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icons.sparkle size={16} color={S.accent} />
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 24,
                    color: S.ink,
                    letterSpacing: -0.48,
                    includeFontPadding: false,
                  },
                ]}
              >
                {points.toLocaleString('en-US')}
              </Text>
            </View>
          </StatCard>

          <StatCard label="Tier">
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: S.ink,
                  lineHeight: 24,
                  includeFontPadding: false,
                },
              ]}
            >
              Noctua
            </Text>
          </StatCard>
        </View>

        {/* Preferences */}
        <SectionLabel>Preferences</SectionLabel>
        <SettingsCard>
          {PREFERENCES.map((item, i) => {
            const Icon = Icons[item.iconKey];
            const isLast = i === PREFERENCES.length - 1;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={S.accent} />
                </View>
                <Text
                  style={[
                    sansation,
                    { flex: 1, fontSize: 14, color: S.ink },
                  ]}
                >
                  {item.label}
                </Text>
                <Icons.chevR size={14} color={S.inkFaint} />
              </Pressable>
            );
          })}
        </SettingsCard>

        {/* Account */}
        <View style={{ height: 20 }} />
        <SectionLabel>Account</SectionLabel>
        <SettingsCard>
          <Pressable
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <Text
              style={[
                sansation,
                { flex: 1, fontSize: 14, color: S.ink },
              ]}
            >
              Logout
            </Text>
            <Icons.chevR size={14} color={S.inkFaint} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={[
                sansation,
                { flex: 1, fontSize: 14, color: T.red },
              ]}
            >
              Delete my account
            </Text>
            <Icons.chevR size={14} color={S.inkFaint} />
          </Pressable>
        </SettingsCard>

        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginTop: 32, paddingBottom: 10 }}>
          <Text
            style={[
              serif,
              {
                fontStyle: 'italic',
                fontSize: 26,
                lineHeight: 30,
                color: T.gold,
                marginBottom: 4,
                includeFontPadding: false,
              },
            ]}
          >
            stealf.
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                color: S.inkFaint,
                letterSpacing: 2.52,
              },
            ]}
          >
            VERSION 0.2 · MMXXVI
          </Text>
        </View>
      </ScrollView>
    </TonalBackground>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      style={[
        sansation,
        {
          fontSize: 10,
          letterSpacing: 3.2,
          textTransform: 'uppercase',
          color: S.inkFaint,
          fontWeight: '700',
          marginBottom: 10,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
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
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.88,
              textTransform: 'uppercase',
              color: S.accent,
              fontWeight: '700',
              marginBottom: 10,
            },
          ]}
        >
          {label}
        </Text>
        {children}
      </LinearGradient>
    </View>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.9)', 'rgba(10,10,12,0.95)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}
