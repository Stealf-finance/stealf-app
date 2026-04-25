import { Pressable, Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  count: number;
  active: number;
  labels: string[];
  onSelect?: (i: number) => void;
};

export function CarouselBar({ count, active, labels, onSelect }: Props) {
  return (
    <View className="flex-row" style={{ paddingHorizontal: 24, marginBottom: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect?.(i)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: i === active ? T.gold : T.hairline,
          }}
        >
          <Text
            style={[
              sansationBold,
              {
                fontSize: 12,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: i === active ? T.ink : T.inkFaint,
                textAlign: 'center',
              },
            ]}
          >
            {labels[i]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
