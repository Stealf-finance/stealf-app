import { z } from 'zod';

const SolanaAddress = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'invalid Solana base58 address');

export const UserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  bankWallet: SolanaAddress,
  stealfWallet: SolanaAddress.optional().nullable(),
  subOrgId: z.string().min(1),
  points: z.number().int().nonnegative().default(0),
  stealthRegistered: z.boolean().optional(),
  bankRegistered: z.boolean().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  sessionToken: z.string().min(1),
});
export type Session = z.infer<typeof SessionSchema>;

const BackendUserSchema = z.object({
  email: z.string().email(),
  username: z.string().nullish(),
  pseudo: z.string().nullish(),
  bank_wallet: SolanaAddress,
  stealf_wallet: SolanaAddress.optional().nullable(),
  subOrgId: z.string().min(1),
  points: z.number().int().nonnegative().nullish(),
});

export const UserProfileResponseSchema = z
  .object({ user: BackendUserSchema })
  .or(BackendUserSchema.transform((user) => ({ user })))
  .transform(({ user }) => UserSchema.parse({
    email: user.email,
    username: user.username ?? user.pseudo ?? '',
    bankWallet: user.bank_wallet,
    stealfWallet: user.stealf_wallet ?? null,
    subOrgId: user.subOrgId,
    points: user.points ?? 0,
  }));

