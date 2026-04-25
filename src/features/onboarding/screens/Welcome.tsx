import { Text, View } from 'react-native';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import {
  sansationBold,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  onStart: () => void;
  onLogin: () => void;
};

export function Welcome({ onStart, onLogin }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={[
            serif,
            {
              fontSize: 72,
              lineHeight: 92,
              color: S.ink,
              letterSpacing: -2.88,
              marginBottom: 10,
              textAlign: 'center',
              includeFontPadding: false,
            },
          ]}
        >
          stealf<Text style={{ color: S.accent }}>.</Text>
        </Text>

        <Text
          style={[
            sansationBold,
            {
              fontSize: 9,
              letterSpacing: 3.78,
              textTransform: 'uppercase',
              color: S.accent,
              marginBottom: 48,
            },
          ]}
        >
          Private Banking
        </Text>

        <Text
          style={[
            sansationLight,
            {
              fontSize: 28,
              lineHeight: 34,
              letterSpacing: -0.56,
              color: S.ink,
              textAlign: 'center',
              marginBottom: 14,
              maxWidth: 280,
            },
          ]}
        >
          Your money, your rules.
        </Text>

        <Text
          style={[
            serif,
            {
              fontSize: 16,
              lineHeight: 24,
              color: S.inkDim,
              textAlign: 'center',
              maxWidth: 280,
            },
          ]}
        >
          Hold crypto. Spend cash. Stay private.
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96,
          paddingHorizontal: 28,
          gap: 10,
        }}
      >
        <PillBtn
          variant="primary"
          tone="silver"
          label="Create account"
          onPress={onStart}
        />
        <PillBtn
          variant="secondary"
          label="I already have an account"
          onPress={onLogin}
        />
      </View>
    </View>
  );
}
