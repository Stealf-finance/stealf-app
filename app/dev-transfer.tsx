import { Redirect } from 'expo-router';
import { DevConfidentialTransferScreen } from '@/src/features/umbra/screens/DevConfidentialTransferScreen';

export default function DevTransfer() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevConfidentialTransferScreen />;
}
