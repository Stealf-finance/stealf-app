import { useState } from 'react';
import { Text, View, Alert } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';

export default function Index() {
  const [tab, setTab] = useState<TabId>('bank');
  return (
    <Frame>
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink text-2xl font-sans-light">Active: {tab}</Text>
      </View>
      <TabBar
        active={tab}
        onTab={setTab}
        onMoove={() => Alert.alert('Open Moove')}
      />
    </Frame>
  );
}
