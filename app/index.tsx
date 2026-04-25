import { useState } from 'react';
import { Frame } from '@/src/design-system/primitives/Frame';
import { TopNav } from '@/src/design-system/primitives/TopNav';

export default function Index() {
  const [active, setActive] = useState<'bank' | 'stealth'>('bank');
  return (
    <Frame>
      <TopNav active={active} onChange={setActive} />
    </Frame>
  );
}
