import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  /** Bare 3D PNG, Home-grid style (e.g. require('@/assets/images/earn.png')). */
  image: number;
  label: string;
  /** Optional stat under the label (e.g. the Points count) — rendered like a
   *  Home grid card value (22/28 ink over a 14/20 inkDim label). */
  value?: string;
  onPress?: () => void;
};

/** Square glass tile — same chrome AND content anatomy as the Home grid
 *  cards (BlurGlass 22 / padding 20 / bare 40pt image), side-by-side pairs. */
export function ProfileTile({ image, label, value, onPress }: Props) {
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
        <Image
          source={image}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={{ width: 40, height: 40 }}
        />
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
