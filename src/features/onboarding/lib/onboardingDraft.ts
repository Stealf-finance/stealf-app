import {
  SECURE_STORE_KEYS,
  deleteSecure,
  getSecureJson,
  setSecureJson,
} from '@/src/services/auth/secureStore';
import { OnboardingDraftSchema, type OnboardingDraft } from '../types';

const TTL_MS = 10 * 60 * 1000;

export async function saveOnboardingDraft(
  draft: Omit<OnboardingDraft, 'createdAt'>,
): Promise<void> {
  const full: OnboardingDraft = { ...draft, createdAt: Date.now() };
  await setSecureJson(SECURE_STORE_KEYS.ONBOARDING_DRAFT, full);
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  const raw = await getSecureJson<unknown>(SECURE_STORE_KEYS.ONBOARDING_DRAFT);
  if (!raw) return null;

  const parsed = OnboardingDraftSchema.safeParse(raw);
  if (!parsed.success) {
    await clearOnboardingDraft();
    return null;
  }

  if (Date.now() - parsed.data.createdAt > TTL_MS) {
    await clearOnboardingDraft();
    return null;
  }

  return parsed.data;
}

export async function clearOnboardingDraft(): Promise<void> {
  await deleteSecure(SECURE_STORE_KEYS.ONBOARDING_DRAFT);
}
