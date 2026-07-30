import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Tone } from '@/src/design-system/palettes';

export type PrivacyMode = 'public' | 'private';

type Ctx = {
  mode: PrivacyMode;
  setMode: (m: PrivacyMode) => void;
  tone: Tone;
};

const PrivacyModeCtx = createContext<Ctx | null>(null);

export function PrivacyModeProvider({
  children,
  initial = 'private',
}: {
  children: ReactNode;
  initial?: PrivacyMode;
}) {
  const [mode, setMode] = useState<PrivacyMode>(initial);
  const tone: Tone = mode === 'private' ? 'gold' : 'silver';
  const value = useMemo(() => ({ mode, setMode, tone }), [mode, tone]);
  return (
    <PrivacyModeCtx.Provider value={value}>
      {children}
    </PrivacyModeCtx.Provider>
  );
}

export function usePrivacyMode() {
  const ctx = useContext(PrivacyModeCtx);
  if (!ctx) {
    throw new Error('usePrivacyMode must be used inside PrivacyModeProvider');
  }
  return ctx;
}
