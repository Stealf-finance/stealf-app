import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  title: string;
  onBack?: () => void;
  /** When true, allow the title to shrink to fit. Used by long titles like
   *  "Set up your Wallet" that risk wrapping on small devices. */
  adjustFontSize?: boolean;
};

/** The 32pt centered page title + leading BackBtn row used at the top of
 *  every modal screen. Single source of truth — extracted from ~10
 *  duplicates with subtly drifting padding/letterSpacing. */
export function PageTitleHeader({ title, onBack, adjustFontSize }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {onBack ? <BackBtn onPress={onBack} /> : <View style={{ width: 36 }} />}
      <Text
        adjustsFontSizeToFit={adjustFontSize}
        minimumFontScale={adjustFontSize ? 0.75 : undefined}
        numberOfLines={adjustFontSize ? 1 : undefined}
        style={[
          sansation,
          {
            flex: 1,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: '600',
            color: T.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );
}
