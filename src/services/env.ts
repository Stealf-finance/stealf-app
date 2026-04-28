import { z } from 'zod';

const EnvSchema = z.object({
  EXPO_PUBLIC_ORGANIZATION_ID: z.string().min(1, 'required'),
  EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID: z.string().min(1, 'required'),
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_SOLANA_RPC_URL: z.string().url(),
  EXPO_PUBLIC_SOLANA_WSS_URL: z.string().url(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  EXPO_PUBLIC_POSTHOG_API_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  // Dev-only: bypass auth redirects so we can browse (auth) and (tabs) freely
  // while building UI. Never set to "true" in a production build.
  EXPO_PUBLIC_DEV_BYPASS_AUTH: z
    .union([z.literal('true'), z.literal('false'), z.literal('')])
    .optional()
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;

  const raw = {
    EXPO_PUBLIC_ORGANIZATION_ID: process.env.EXPO_PUBLIC_ORGANIZATION_ID,
    EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID: process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SOLANA_RPC_URL: process.env.EXPO_PUBLIC_SOLANA_RPC_URL,
    EXPO_PUBLIC_SOLANA_WSS_URL: process.env.EXPO_PUBLIC_SOLANA_WSS_URL,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    EXPO_PUBLIC_DEV_BYPASS_AUTH: process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH,
  };

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  _env = parsed.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) throw new Error('validateEnv() must be called before getEnv()');
  return _env;
}
