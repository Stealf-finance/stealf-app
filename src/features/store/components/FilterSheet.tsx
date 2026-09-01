import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { StoreSheet } from './StoreSheet';
import { CATEGORY_LABELS } from '../lib/types';
import type { StoreCategory } from '../lib/types';

const S = txPalette('silver');

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={{
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 100,
        backgroundColor: active ? S.accentSoft : T.bgCard,
        borderWidth: 1,
        borderColor: active ? T.hairlineStrong : T.hairline,
      }}
    >
      <Text
        style={[
          sansation,
          {
            fontSize: 13,
            fontWeight: active ? '700' : '500',
            color: active ? S.ink : S.inkDim,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Category + availability filter. Selections apply live — there is no
 * draft/Apply step, so the sheet has nothing to reconcile on dismiss.
 * `categories` lists only what the loaded catalog actually contains.
 */
export function FilterSheet({
  open,
  onClose,
  categories,
  selected,
  onToggle,
  inStockOnly,
  onToggleInStock,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  categories: StoreCategory[];
  selected: StoreCategory[];
  onToggle: (category: StoreCategory) => void;
  inStockOnly: boolean;
  onToggleInStock: () => void;
  onReset: () => void;
}) {
  const hasFilter = selected.length > 0 || inStockOnly;

  return (
    <StoreSheet open={open} onClose={onClose} title="Filter">
      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_LABELS[c]}
              active={selected.includes(c)}
              onPress={() => onToggle(c)}
            />
          ))}
        </View>
      </ScrollView>

      <Pressable
        onPress={onToggleInStock}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: inStockOnly }}
        accessibilityLabel="In stock only"
        style={{
          marginTop: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: T.hairline,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inStockOnly ? S.accent : 'transparent',
            borderWidth: 1,
            borderColor: inStockOnly ? S.accent : T.hairlineStrong,
          }}
        >
          {inStockOnly ? <Icons.check size={14} color={T.bgLightInk} /> : null}
        </View>
        <Text style={[sansation, { fontSize: 15, color: S.ink }]}>In stock only</Text>
      </Pressable>

      <Pressable
        onPress={onReset}
        disabled={!hasFilter}
        accessibilityRole="button"
        accessibilityLabel="Reset filters"
        style={{ paddingVertical: 10, opacity: hasFilter ? 1 : 0.35 }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: S.inkDim,
            },
          ]}
        >
          Reset
        </Text>
      </Pressable>
    </StoreSheet>
  );
}
