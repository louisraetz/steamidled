import { z } from 'zod';

export const telegramTokenSchema = z.object({
  token: z.string().trim().min(1, 'Paste the bot token.'),
});

export type TelegramTokenValues = z.infer<typeof telegramTokenSchema>;
