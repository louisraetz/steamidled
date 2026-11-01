import { Hono } from 'hono';
import { settingsPatchSchema } from '../../settings/schema.js';
import type { WebController } from '../controller.js';
import { validate } from '../schemas.js';

export function settingsRoutes(controller: WebController): Hono {
  return new Hono()
    .put('/api/settings', validate('json', settingsPatchSchema), async (c) => {
      return c.json(await controller.updateSettings(c.req.valid('json')));
    })
    .post('/api/schedule/reroll', async (c) => c.json(await controller.rerollSchedules()))
    .post('/api/schedule/end-all-cooldowns', async (c) => c.json(await controller.endAllCooldowns()));
}
