import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { TabBar, type TabId } from '@/src/design-system/primitives/TabBar';
import { QuickActionMenu } from './QuickActionMenu';

const TAB_IDS: TabId[] = ['bank', 'history', 'profile'];

/**
 * The app's bottom navigation — the pill TabBar (Home / History / Profile) plus
 * the "+" QuickActionMenu FAB. Rendered by the tabs layout AND by pushed
 * wallet-detail screens so the nav stays present there too. Derives the active
 * tab from the route segments; on a non-tab route the last visited tab stays lit.
 */
export function AppNavBar() {
  const router = useRouter();
  const segments = useSegments();

  const tabSegment = segments.find((s) => TAB_IDS.includes(s as TabId)) as
    | TabId
    | undefined;
  const [lastTab, setLastTab] = useState<TabId>(tabSegment ?? 'bank');
  useEffect(() => {
    if (tabSegment && tabSegment !== lastTab) setLastTab(tabSegment);
  }, [tabSegment, lastTab]);
  const active = tabSegment ?? lastTab;

  const handleTab = (id: TabId) => {
    if (tabSegment === id) return;
    router.replace(`/(tabs)/${id}` as never);
  };

  return (
    <>
      <TabBar active={active} tone="silver" onTab={handleTab} />
      {/* FAB only on Home — hidden on the History and Profile tabs. */}
      {active === 'bank' ? <QuickActionMenu /> : null}
    </>
  );
}
