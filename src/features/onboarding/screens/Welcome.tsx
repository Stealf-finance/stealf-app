import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Em } from '@/src/design-system/primitives/Em';
import { sansationBold, sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Frame>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 48,
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 48,
        }}
      >
        <View className="items-center" style={{ marginBottom: 40 }}>
          <Text style={[serif, { fontSize: 56, color: T.gold, letterSpacing: -1.1 }]}>
            stealf.
          </Text>
          <Text
            style={[
              sansationBold,
              {
                fontSize: 10,
                letterSpacing: 3.2,
                color: T.inkFaint,
                marginTop: 4,
              },
            ]}
          >
            EST. MMXXVI · SOLANA
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
          <Kicker style={{ marginBottom: 16 }}>— a new bank for —</Kicker>
          <Text
            style={[
              sansationLight,
              { fontSize: 44, color: T.ink, lineHeight: 46, letterSpacing: -1.3 },
            ]}
          >
            a world where{'\n'}
            <Em style={{ fontSize: 44 }}>everything</Em>
            {'\n'}is watched.
          </Text>
          <Text
            style={[
              serif,
              { fontSize: 16, color: T.inkDim, marginTop: 22, lineHeight: 24 },
            ]}
          >
            Hold crypto. Spend cash.{'\n'}Stay invisible.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.push('/(auth)/invite')}
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 100,
              backgroundColor: T.gold,
              alignItems: 'center',
              shadowColor: T.gold,
              shadowOpacity: 0.4,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
              elevation: 12,
            }}
          >
            <Text
              style={[
                sansationBold,
                {
                  fontSize: 12,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: '#0a0a0a',
                },
              ]}
            >
              Create account
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 100,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: T.hairline,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                sansationBold,
                {
                  fontSize: 12,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: T.ink,
                },
              ]}
            >
              I have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </Frame>
  );
}
