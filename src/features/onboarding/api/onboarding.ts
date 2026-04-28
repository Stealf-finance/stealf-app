import { apiPost, apiGet } from '@/src/services/api/client';
import { ApiError } from '@/src/services/api/errors';
import {
  CheckAvailabilityResponseSchema,
  UserProfileResponseSchema,
  VerificationStatusSchema,
  type CheckAvailabilityResponse,
  type User,
  type VerificationStatus,
} from '../types';

export async function checkAvailability(input: {
  email: string;
  pseudo: string;
  inviteCode?: string;
}): Promise<CheckAvailabilityResponse> {
  const raw = await apiPost('/api/users/check-availability', '', input);
  return CheckAvailabilityResponseSchema.parse(raw);
}

export async function checkVerificationStatus(
  preAuthToken: string,
): Promise<VerificationStatus> {
  const raw = await apiGet('/api/users/check-verification', preAuthToken);
  return VerificationStatusSchema.parse(raw);
}

export async function sendMagicLink(input: {
  email: string;
  pseudo: string;
  preAuthToken?: string;
}): Promise<void> {
  await apiPost('/api/users/send-magic-link', input.preAuthToken ?? '', {
    email: input.email,
    pseudo: input.pseudo,
  });
}

export async function finalizeAuth(input: {
  sessionToken: string;
  preAuthToken?: string;
  email: string;
  pseudo: string;
  bankWallet: string;
}): Promise<User> {
  const { sessionToken, preAuthToken, email, pseudo, bankWallet } = input;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  };
  if (preAuthToken) headers['X-Preauth-Token'] = preAuthToken;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const response = await fetch(`${apiUrl}/api/users/auth`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, pseudo, cash_wallet: bankWallet }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error || `auth failed: ${response.status}`,
      response.status,
      data,
    );
  }

  const json = await response.json();
  const payload = json.data ?? json;
  return UserProfileResponseSchema.parse(payload);
}
