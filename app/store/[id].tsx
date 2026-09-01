import { useLocalSearchParams } from 'expo-router';
import { GiftCardDetailScreen } from '@/src/features/store/screens/GiftCardDetailScreen';

export default function GiftCardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GiftCardDetailScreen productId={String(id ?? '')} />;
}
