import { TransactionsScreen } from '@/src/features/bank/screens/TransactionsScreen';

// History tab: the transactions list, rendered without the modal back button.
export default function HistoryTab() {
  return <TransactionsScreen embedded />;
}
