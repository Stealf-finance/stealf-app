import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TxRow } from '@/src/design-system/primitives/TxRow';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 justify-center" style={{ paddingHorizontal: 24 }}>
        <TxRow type="received" title="Received" meta="21 Apr · 04:41 am" amount="+$176.76" />
        <TxRow type="sent" title="Carrefour" meta="21 Apr · 11:20 am" amount="−$34.50" />
        <TxRow type="sent" title="Spotify" meta="15 Apr · 09:00 am" amount="−$9.99" last />
      </View>
    </Frame>
  );
}
