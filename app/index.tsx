import { Text } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { Em } from '@/src/design-system/primitives/Em';
import { sansationLight } from '@/src/design-system/typography';

export default function Index() {
  return (
    <Frame>
      <Text
        style={[sansationLight, { fontSize: 36, color: '#f1ece1' }]}
        className="mt-[200px] mx-auto text-center"
      >
        a world where <Em style={{ fontSize: 36 }}>everything</Em>{'\n'}is watched.
      </Text>
    </Frame>
  );
}
