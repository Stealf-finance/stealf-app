import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAsyncStorageBackend(namespace: string): Promise<void> {
  const prefix = `umbra-store.${namespace}.`;
  const allKeys = await AsyncStorage.getAllKeys();
  const ours = allKeys.filter((k) => k.startsWith(prefix));
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}
