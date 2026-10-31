import { Hono } from 'hono';
import type { WebController } from '../controller.js';
import { exemptSchema, favoriteParamSchema, favoriteSchema, selectionSchema, validate } from '../schemas.js';

export function libraryRoutes(controller: WebController): Hono {
  return new Hono()
    .get('/api/library', (c) => c.json(controller.library()))
    .put('/api/selection', validate('json', selectionSchema), async (c) => {
      const { appIds } = c.req.valid('json');
      return c.json(await controller.setSelection(appIds));
    })
    .post('/api/idling/stop', async (c) => c.json(await controller.stopIdling()))
    .post('/api/idling/start-favorites', async (c) => c.json(await controller.startFavorites()))
    .put(
      '/api/favorites/:appid',
      validate('param', favoriteParamSchema),
      validate('json', favoriteSchema),
      async (c) => {
        const { appid } = c.req.valid('param');
        const { favorite } = c.req.valid('json');
        return c.json(await controller.setFavorite(appid, favorite));
      }
    )
    .put('/api/exempt', validate('json', exemptSchema), async (c) => {
      const { appId } = c.req.valid('json');
      return c.json(await controller.setExempt(appId));
    });
}
