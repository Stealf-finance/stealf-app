/**
 * Portola session — api layer.
 *
 * Mints an embed session on our backend (which holds the secret Portola key
 * and calls Portola server-side). We only ever receive the one-time embedUrl.
 */
import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export const PortolaSessionSchema = z.object({
  sessionId: z.string(),
  embedUrl: z.string().url(),
  expiresAt: z.string(),
});
export type PortolaSession = z.infer<typeof PortolaSessionSchema>;

/** POST /api/portola/session with the borrower's EVM address. */
export async function mintPortolaSession(
  token: string,
  address: string,
): Promise<PortolaSession> {
  const raw = await apiPost('/api/portola/session', token, { address });
  return PortolaSessionSchema.parse(raw);
}
