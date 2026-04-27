import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

export type Recipient = {
  name: string;
  meta: string;
  avatar?: [string, string];
};

type Props = Recipient & {
  tone?: Tone;
  onPress?: () => void;
};

export function RecipientRow({
  name,
  meta,
  avatar,
  tone = 'silver',
  onPress,
}: Props) {
  const palette = txPalette(tone);
  const initial = name.replace('@', '')[0]?.toUpperCase() ?? '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Send to ${name}`}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: palette.hairline,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        {avatar ? (
          <LinearGradient
            colors={avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        ) : (
          <Text
            style={[
              serif,
              {
                fontSize: 18,
                fontStyle: 'italic',
                color: palette.ink,
                lineHeight: 20,
                includeFontPadding: false,
              },
            ]}
          >
            {initial}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, color: palette.ink }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontSize: 11, color: palette.inkFaint, marginTop: 2 }}>
          {meta}
        </Text>
      </View>
      <Icons.chevR size={16} color={palette.inkDim} />
    </Pressable>
  );
}
