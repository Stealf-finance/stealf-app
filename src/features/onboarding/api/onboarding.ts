import { z } from 'zod';
import { getEnv } from '@/src/services/env';
import { ApiError } from '@/src/services/api/errors';
import {
  UserProfileResponseSchema,
  type User,
} from '../types';

const OnboardingErrorCodeSchema = z.enum([
  'PSEUDO_TAKEN',
  'PSEUDO_INVALID',
  'EMAIL_INVALID',
  'EMAIL_TAKEN',
  'UNKNOWN',
]);
export type OnboardingErrorCode = z.infer<typeof OnboardingErrorCodeSchema>;

const ApiErrorBodySchema = z
  .object({
    code: OnboardingErrorCodeSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export class OnboardingError extends Error {
  code: OnboardingErrorCode;
  status: number;
  retryAfterSeconds?: number;
  constructor(args: {
    code: OnboardingErrorCode;
    status: number;
    message?: string;
    retryAfterSeconds?: number;
  }) {
    super(args.message ?? args.code);
    this.name = 'OnboardingError';
    this.code = args.code;
    this.status = args.status;
    this.retryAfterSeconds = args.retryAfterSeconds;
  }
}

async function request<T extends object>(
  path: string,
  init: {
    method: 'GET' | 'POST';
    body?: object;
    sessionToken?: string | null;
  },
  schema: z.ZodType<T>,
): Promise<T> {
  const { EXPO_PUBLIC_API_URL } = getEnv();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.sessionToken) headers.Authorization = `Bearer ${init.sessionToken}`;

  const response = await fetch(`${EXPO_PUBLIC_API_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const raw = (await response.json().catch(() => ({}))) as unknown;
    const parsed = ApiErrorBodySchema.safeParse(raw);
    const code: OnboardingErrorCode =
      (parsed.success && parsed.data.code) || 'UNKNOWN';
    const retryAfterRaw = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterRaw
      ? Number.parseInt(retryAfterRaw, 10)
      : undefined;

    if (code !== 'UNKNOWN') {
      throw new OnboardingError({
        code,
        status: response.status,
        message:
          parsed.success && (parsed.data.message || parsed.data.error)
            ? parsed.data.message ?? parsed.data.error
            : undefined,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds
          : undefined,
      });
    }

    throw new ApiError(
      `request failed: ${response.status}`,
      response.status,
      raw as Record<string, unknown>,
    );
  }

  const json = (await response.json()) as { data?: unknown } & Record<
    string,
    unknown
  >;
  const payload = (json.data ?? json) as unknown;
  // Zod's verbose JSON error.message would otherwise leak straight onto the
  // OTP/auth screen via the surrounding catch — keep it short and human.
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error('Unexpected response from server');
  }
  return result.data;
}

export type AuthMethod = 'google' | 'apple' | 'email';

export async function finalizeOAuthAuth(input: {
  sessionToken: string;
  subOrgId: string;
  email: string | undefined;
  pseudo: string | undefined;
  cashWallet: string;
  authMethod: AuthMethod;
}): Promise<User> {
  return request(
    '/api/users/auth/login',
    {
      method: 'POST',
      body: {
        subOrgId: input.subOrgId,
        email: input.email,
        pseudo: input.pseudo,
        bank_wallet: input.cashWallet,
        authMethod: input.authMethod,
      },
      sessionToken: input.sessionToken,
    },
    UserProfileResponseSchema,
  );
}

export async function deleteAccountOnBackend(
  sessionToken: string,
): Promise<void> {
  const { EXPO_PUBLIC_API_URL } = getEnv();
  const response = await fetch(`${EXPO_PUBLIC_API_URL}/api/users/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ApiError(
      `deleteAccount failed: ${response.status}`,
      response.status,
    );
  }
}
