import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { MAX_IDLE_GAMES } from '../constants.js';
import { apiError } from './errors.js';

const appIdSchema = z.number().int().positive();

export const selectionSchema = z
  .object({
    appIds: z
      .array(appIdSchema)
      .max(MAX_IDLE_GAMES, `Steam idles at most ${MAX_IDLE_GAMES} games at once.`)
      .refine((ids) => new Set(ids).size === ids.length, 'Each game can only be selected once.'),
  })
  .strict();

export const favoriteParamSchema = z.object({ appid: z.coerce.number().int().positive() });

export const favoriteSchema = z.object({ favorite: z.boolean() }).strict();

export const exemptSchema = z.object({ appId: appIdSchema.nullable() }).strict();

export const passwordLoginSchema = z
  .object({
    accountName: z.string().trim().min(1, 'Enter your account name.').max(64),
    password: z.string().min(1, 'Enter your password.').max(256),
  })
  .strict();

export const guardCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Enter the Steam Guard code.')
      .max(16)
      .transform((code) => code.toUpperCase()),
  })
  .strict();

export const telegramTokenSchema = z
  .object({ token: z.string().trim().min(1, 'Paste the bot token.').max(256) })
  .strict();

export function validate<Target extends 'json' | 'param', Schema extends z.ZodType>(
  target: Target,
  schema: Schema
) {
  return zValidator(target, schema, (result, c) => {
    if (result.success) return;
    const message = result.error.issues[0]?.message ?? 'Invalid request.';
    return c.json(apiError(message, 'Reload the page and try again.'), 422);
  });
}
