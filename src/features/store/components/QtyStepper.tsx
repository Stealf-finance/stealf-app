import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { MAX_QUANTITY } from '../lib/cart';

const S = txPalette('silver');

function StepBtn({
  iconKey,
  onPress,
  disabled,
  label,
  size,
}: {
  iconKey: 'plus' | 'minus';
  onPress: () => void;
  disabled: boolean;
  label: string;
  size: number;
}) {
  const Icon = Icons[iconKey];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.bgCard,
        borderWidth: 1,
        borderColor: T.hairline,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Icon size={size * 0.44} color={S.ink} />
    </Pressable>
  );
}

/** − N + . Clamped to [1, MAX_QUANTITY]; going below 1 is the caller's
 *  business (the cart removes the line, the detail screen just stops). */
export function QtyStepper({
  quantity,
  onChange,
  min = 1,
  size = 30,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <StepBtn
        iconKey="minus"
        size={size}
        label="Decrease quantity"
        disabled={quantity <= min}
        onPress={() => onChange(quantity - 1)}
      />
      <Text
        style={[
          sansation,
          {
            minWidth: 20,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {quantity}
      </Text>
      <StepBtn
        iconKey="plus"
        size={size}
        label="Increase quantity"
        disabled={quantity >= MAX_QUANTITY}
        onPress={() => onChange(quantity + 1)}
      />
    </View>
  );
}
