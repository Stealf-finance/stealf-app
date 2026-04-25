import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg gap-2">
      <Text className="text-ink font-sans-light text-2xl">Sansation Light</Text>
      <Text className="text-ink font-sans text-2xl">Sansation Regular</Text>
      <Text className="text-ink font-sans-bold text-2xl">Sansation Bold</Text>
      <Text className="text-gold font-serif text-3xl">Cormorant italic</Text>
      <Text className="text-ink font-mono text-base">JetBrains Mono · 0.0142 SOL</Text>
    </View>
  );
}
