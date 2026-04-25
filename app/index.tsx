import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg gap-3">
      <Icons.shield size={32} color="#c9a86a" />
      <Icons.bank size={28} color="#f1ece1" />
      <Icons.arrUpRight size={20} color="#7ea688" />
      <Text className="text-ink font-sans">Icons render</Text>
    </View>
  );
}
