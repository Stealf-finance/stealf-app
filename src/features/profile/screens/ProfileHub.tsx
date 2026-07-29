import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useLogout } from '@/src/features/onboarding/hooks/useLogout';
import { useDeleteAccount } from '@/src/features/onboarding/hooks/useDeleteAccount';
import { ProfileIdentity } from '../components/ProfileIdentity';

const S = txPalette('silver');

type FlatRowProps = {
  label: string;
  onPress?: () => void;
  labelColor?: string;
  disabled?: boolean;
  role?: 'button' | 'link';
  last?: boolean;
};

/** A flat, left-aligned list row — no card background, hairline separator. */
function FlatRow({
  label,
  onPress,
  labelColor = S.ink,
  disabled = false,
  role = 'button',
  last = false,
}: FlatRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: T.trace,
        }}
      >
        <Text
          style={[
            sansation,
            {
              flex: 1,
              fontSize: 15,
              lineHeight: 20,
              color: labelColor,
              includeFontPadding: false,
            },
          ]}
        >
          {label}
        </Text>
        <Icons.chevR size={14} color={S.inkFaint} />
      </View>
    </Pressable>
  );
}

export function ProfileHub() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { user } = useAuth();
  const turnkey = useTurnkey();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();

  // Backend never holds plaintext email. Email-OTP users have it on the
  // Turnkey record; OAuth (Apple/Google) users don't, so fall back to the
  // email we decoded from the OIDC token at sign-in (kept on the user record).
  const email = user?.email ?? turnkey.user?.userEmail ?? '';

  const confirmLogout = () => {
    Alert.alert(
      'Log out?',
      'You will need to sign in again to access your wallets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => logout.mutate(),
        },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your Stealf account and wipes your wallets from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAccount.mutate(),
        },
      ],
    );
  };

  return (
    <CenterGlow tone="silver" flat>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: "Profile" centered */}
        <View style={{ paddingTop: 8, paddingBottom: 6, alignItems: 'center' }}>
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
            Profile
          </Text>
        </View>

        {/* Identity — left-aligned, no provider logo */}
        <ProfileIdentity user={user} email={email} />

        {/* Points — outlined (grey contour, no fill), icon on the same line */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginTop: 24,
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
          }}
        >
          <Image
            source={require('@/assets/images/earn.png')}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width: 34, height: 34 }}
          />
          <Text
            style={[
              sansation,
              {
                flex: 1,
                fontSize: 15,
                lineHeight: 20,
                color: S.inkDim,
                includeFontPadding: false,
              },
            ]}
          >
            Points
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 22,
                lineHeight: 28,
                letterSpacing: -0.4,
                color: S.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {(user?.points ?? 0).toLocaleString('en-US')}
          </Text>
        </View>

        {/* Settings — flat left-aligned rows */}
        <View style={{ marginTop: 24 }}>
          <FlatRow
            label="Solana Private Key"
            onPress={() => router.push('/profile/private-key')}
          />
          <FlatRow
            label="Contact Support"
            role="link"
            onPress={() => void Linking.openURL('https://t.me/stealf_bot')}
          />
          <FlatRow
            label="Privacy Policy"
            role="link"
            onPress={() => void Linking.openURL('https://stealf.xyz/privacy')}
          />
          <FlatRow
            label="Terms of Service"
            role="link"
            onPress={() => void Linking.openURL('https://stealf.xyz/terms')}
            last
          />
        </View>

        {/* Account */}
        <View style={{ marginTop: 24 }}>
          <FlatRow
            label={logout.isPending ? 'Logging out…' : 'Log out'}
            disabled={logout.isPending}
            onPress={confirmLogout}
          />
          <FlatRow
            label={deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
            labelColor={T.error}
            disabled={deleteAccount.isPending}
            onPress={confirmDeleteAccount}
            last
          />
        </View>

        {/* Footer — small white Stealf logo + build line */}
        <View style={{ alignItems: 'center', marginTop: 36, paddingBottom: 10 }}>
          <Image
            source={require('@/assets/images/logo-transparent.png')}
            contentFit="contain"
            cachePolicy="memory-disk"
            tintColor="#ffffff"
            style={{ width: 44, height: 44 }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                color: S.inkFaint,
                letterSpacing: 1.5,
                marginTop: 4,
                includeFontPadding: false,
              },
            ]}
          >
            version beta - build 20
          </Text>
        </View>
      </ScrollView>
    </CenterGlow>
  );
}
