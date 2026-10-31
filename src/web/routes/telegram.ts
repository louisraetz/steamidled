import { Hono } from 'hono';
import type { WebController } from '../controller.js';
import { telegramTokenSchema, validate } from '../schemas.js';

export function telegramRoutes(controller: WebController): Hono {
  return new Hono()
    .post('/api/telegram/token', validate('json', telegramTokenSchema), async (c) => {
      const { token } = c.req.valid('json');
      return c.json(await controller.telegramToken(token));
    })
    .post('/api/telegram/confirm', async (c) => c.json(await controller.telegramConfirm()))
    .delete('/api/telegram', async (c) => c.json(await controller.telegramDisable()));
}
