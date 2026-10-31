import { z } from 'zod';

export const passwordLoginSchema = z.object({
  accountName: z.string().trim().min(1, 'Enter your account name.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type PasswordLoginValues = z.infer<typeof passwordLoginSchema>;

export const GUARD_CODE_LENGTH = 5;

export const guardCodeSchema = z.object({
  code: z.string().length(GUARD_CODE_LENGTH, 'Enter all 5 characters.'),
});

export type GuardCodeValues = z.infer<typeof guardCodeSchema>;
