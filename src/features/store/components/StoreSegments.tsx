import { Pressable, Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

export type StoreTab = 'buy' | 'my-cards';

const TABS: { id: StoreTab; label: string }[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'my-cards', label: 'My Cards' },
];

/**
 * Buy / My Cards. Reuses RangePills' uppercase typography; the selected tab
 * is marked by a silver rule spanning the tab plus bolder ink — no fill, no
 * border, which RangePills has no notion of either.
 */
export function StoreSegments({
  value,
  onChange,
}: {
  value: StoreTab;
  onChange: (tab: StoreTab) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 20,
        marginBottom: 20,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={{
              // The rule spans the tab, not the label, so both tabs underline
              // to the same width whatever their wording. Transparent when
              // inactive, so switching tabs doesn't shift the row.
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: active ? S.accent : 'transparent',
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.2,
                  fontWeight: active ? '700' : '500',
                  color: active ? S.ink : S.inkFaint,
                  textTransform: 'uppercase',
                  includeFontPadding: false,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
