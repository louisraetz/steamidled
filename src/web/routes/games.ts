import { Hono } from 'hono';
import type { WebController } from '../controller.js';
import { coolDownNowSchema, cooldownRemainingSchema, gameParamSchema, nextCooldownSchema, validate } from '../schemas.js';

export function gameRoutes(controller: WebController): Hono {
  return new Hono()
    .post(
      '/api/games/:appid/cooldown',
      validate('param', gameParamSchema),
      validate('json', coolDownNowSchema),
      async (c) => c.json(await controller.coolDownNow(c.req.valid('param').appid, c.req.valid('json').hours))
    )
    .delete('/api/games/:appid/cooldown', validate('param', gameParamSchema), async (c) =>
      c.json(await controller.endCooldownNow(c.req.valid('param').appid))
    )
    .put(
      '/api/games/:appid/next-cooldown',
      validate('param', gameParamSchema),
      validate('json', nextCooldownSchema),
      async (c) => c.json(await controller.setNextCooldownIn(c.req.valid('param').appid, c.req.valid('json').hours))
    )
    .put(
      '/api/games/:appid/cooldown-remaining',
      validate('param', gameParamSchema),
      validate('json', cooldownRemainingSchema),
      async (c) => c.json(await controller.setCooldownRemaining(c.req.valid('param').appid, c.req.valid('json').hours))
    );
}
