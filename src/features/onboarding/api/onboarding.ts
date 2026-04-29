import { z } from 'zod';
import { getEnv } from '@/src/services/env';
import { ApiError } from '@/src/services/api/errors';
import {
  UserProfileResponseSchema,
  type User,
} from '../types';

/**
 * The new onboarding flow uses a stateful Redis-backed session.
 * Once `startOnboarding` returns a sessionId, every subsequent step
 * sends it back via the `X-Onboarding-Session` header. Backend enforces
 * in-order step transitions and a 15-minute TTL.
 *
 * Session is kept in memory only (never persisted to SecureStore):
 * the TTL matches the duration of the flow, and persisting would risk
 * leaving the client and Redis state diverged across app restarts.
 */

const SESSION_HEADER = 'X-Onboarding-Session';

const OnboardingErrorCodeSchema = z.enum([
  'INVALID_INVITE',
  'INVITE_ALREADY_USED',
  'PSEUDO_TAKEN',
  'PSEUDO_INVALID',
  'EMAIL_INVALID',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'CODE_ALREADY_USED',
  'TOO_MANY_ATTEMPTS',
  'ONBOARDING_SESSION_MISSING',
  'ONBOARDING_SESSION_EXPIRED',
  'STEP_OUT_OF_ORDER',
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
    sessionId?: string | null;
    sessionToken?: string | null;
    preauthHeader?: string | null;
  },
  schema: z.ZodType<T>,
): Promise<T> {
  const { EXPO_PUBLIC_API_URL } = getEnv();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.sessionId) headers[SESSION_HEADER] = init.sessionId;
  if (init.sessionToken) headers.Authorization = `Bearer ${init.sessionToken}`;
  if (init.preauthHeader) headers['X-Preauth-Token'] = init.preauthHeader;

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
  return schema.parse(payload);
}

const InviteOkSchema = z.object({
  onboardingSessionId: z.string().min(1),
});

const EmptyOkSchema = z.object({}).passthrough();

/** Step 1 — submit invite code, receive a fresh onboarding session. */
export async function submitInviteCode(input: {
  inviteCode: string;
}): Promise<{ sessionId: string }> {
  const data = await request(
    '/api/users/onboarding/invite-code',
    { method: 'POST', body: { inviteCode: input.inviteCode } },
    InviteOkSchema,
  );
  return { sessionId: data.onboardingSessionId };
}

/** Step 2 — register the desired pseudo against the session. */
export async function submitName(input: {
  sessionId: string;
  pseudo: string;
}): Promise<void> {
  await request(
    '/api/users/onboarding/name',
    {
      method: 'POST',
      body: { pseudo: input.pseudo },
      sessionId: input.sessionId,
    },
    EmptyOkSchema,
  );
}

/** Step 3 — submit email and trigger 6-digit code dispatch. */
export async function submitEmail(input: {
  sessionId: string;
  email: string;
}): Promise<void> {
  await request(
    '/api/users/onboarding/email',
    {
      method: 'POST',
      body: { email: input.email },
      sessionId: input.sessionId,
    },
    EmptyOkSchema,
  );
}

/** Step 4 — submit the 6-digit code received by email. */
export async function submitVerifyCode(input: {
  sessionId: string;
  code: string;
}): Promise<void> {
  await request(
    '/api/users/onboarding/verify-code',
    {
      method: 'POST',
      body: { code: input.code },
      sessionId: input.sessionId,
    },
    EmptyOkSchema,
  );
}

/**
 * Final step — exchange the verified onboarding session and the Turnkey
 * session token for a backend user record, with the bank wallet address
 * created during the passkey step.
 */
export async function finalizeAuth(input: {
  sessionToken: string;
  sessionId: string;
  email: string;
  pseudo: string;
  bankWallet: string;
}): Promise<User> {
  return request(
    '/api/users/auth',
    {
      method: 'POST',
      body: {
        email: input.email,
        pseudo: input.pseudo,
        cash_wallet: input.bankWallet,
      },
      sessionId: input.sessionId,
      sessionToken: input.sessionToken,
    },
    UserProfileResponseSchema,
  );
}
