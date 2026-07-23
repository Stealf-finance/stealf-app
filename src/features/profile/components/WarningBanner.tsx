import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/** Red inline warning shown above the key cards. */
export function WarningBanner() {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(229,72,77,0.30)',
        backgroundColor: 'rgba(229,72,77,0.08)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icons.info size={14} color={T.error} />
      </View>
      <Text
        style={[
          sansation,
          {
            flex: 1,
            fontSize: 12,
            lineHeight: 17,
            color: T.ink,
          },
        ]}
      >
        Never share your private key. Anyone with access can move your funds —
        Stealf will never ask for it.
      </Text>
    </View>
  );
}
