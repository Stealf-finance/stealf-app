import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useLogout } from '@/src/features/onboarding/hooks/useLogout';
import { useDeleteAccount } from '@/src/features/onboarding/hooks/useDeleteAccount';
import { ProfileIdentity } from '../components/ProfileIdentity';
import { ProfileTile } from '../components/ProfileTile';
import { ProfileRow } from '../components/ProfileRow';
import { ProfileRowGroup } from '../components/ProfileRowGroup';

const S = txPalette('silver');
const GAP = 12; // uniform card spacing, mirrors the Home grid

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
        <ProfileIdentity user={user} email={email} />

        {/* Square tiles — Points stat + About us, full width (Home imagery) */}
        <View style={{ flexDirection: 'row', gap: GAP, marginTop: 28 }}>
          <ProfileTile
            image={require('@/assets/images/earn.png')}
            label="Points"
            value={(user?.points ?? 0).toLocaleString('en-US')}
          />
          <ProfileTile
            image={require('@/assets/images/logo-transparent.png')}
            label="About us"
            onPress={() => void Linking.openURL('https://www.stealf.xyz')}
          />
        </View>

        {/* Solana Private Key — standalone row */}
        <View style={{ marginTop: GAP }}>
          <ProfileRow
            image={require('@/assets/images/Key.png')}
            label="Solana Private Key"
            onPress={() => router.push('/profile/private-key')}
          />
        </View>

        {/* Support & legal — grouped card */}
        <View style={{ marginTop: GAP }}>
          <ProfileRowGroup
            items={[
              {
                image: require('@/assets/images/Lock.png'),
                label: 'Contact Support',
                role: 'link',
                onPress: () => void Linking.openURL('https://t.me/stealf_bot'),
              },
              {
                image: require('@/assets/images/Euro.png'),
                label: 'Privacy Policy',
                role: 'link',
                onPress: () => void Linking.openURL('https://stealf.xyz/privacy'),
              },
              {
                image: require('@/assets/images/Euro.png'),
                label: 'Terms of Service',
                role: 'link',
                onPress: () => void Linking.openURL('https://stealf.xyz/terms'),
              },
            ]}
          />
        </View>

        {/* Account (danger zone) */}
        <View style={{ gap: GAP, marginTop: 28 }}>
          <ProfileRow
            iconKey="arrRight"
            label={logout.isPending ? 'Logging out…' : 'Log out'}
            disabled={logout.isPending}
            onPress={confirmLogout}
          />
          <ProfileRow
            iconKey="trash"
            label={deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
            labelColor={T.error}
            disabled={deleteAccount.isPending}
            onPress={confirmDeleteAccount}
          />
        </View>

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
              { fontSize: 9, color: S.inkFaint, letterSpacing: 2.52 },
            ]}
          >
            VERSION BETA
          </Text>
        </View>
      </ScrollView>
    </CenterGlow>
  );
}
