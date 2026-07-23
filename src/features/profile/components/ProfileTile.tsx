import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  iconKey: keyof typeof Icons;
  label: string;
  /** Optional stat under the label (e.g. the Points count) — rendered like a
   *  Home grid card value (22/28 ink over a 14/20 inkDim label). */
  value?: string;
  onPress?: () => void;
};

/** Square glass tile — same chrome as the Home grid cards (BlurGlass 22 /
 *  padding 20 / 44pt icon disc), used in side-by-side pairs. */
export function ProfileTile({ iconKey, label, value, onPress }: Props) {
  const Icon = Icons[iconKey];
  return (
    // Layout lives on the static wrapper (HomeGrid recipe) — flex props in a
    // Pressable style-fn didn't stretch the tiles to fill the row.
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    >
      <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: S.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={S.accent} />
        </View>
        {/* Fixed-height bottom block (20 + 8 + 28) so label-only tiles match
            stat tiles exactly — heights stay equal without an aspectRatio. */}
        <View
          style={{ marginTop: 18, minHeight: 56, justifyContent: 'flex-end', gap: 8 }}
        >
          {value !== undefined ? (
            <>
              <Text
                style={[
                  sansation,
                  { fontSize: 14, lineHeight: 20, letterSpacing: 0.2, color: S.inkDim },
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  sansation,
                  { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: S.ink },
                ]}
              >
                {value}
              </Text>
            </>
          ) : (
            <Text
              style={[
                sansation,
                { fontSize: 14, lineHeight: 20, letterSpacing: 0.2, color: S.ink },
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      </BlurGlass>
    </Pressable>
  );
}
