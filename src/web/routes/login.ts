import { Hono } from 'hono';
import type { WebController } from '../controller.js';
import { guardCodeSchema, passwordLoginSchema, validate } from '../schemas.js';

export function loginRoutes(controller: WebController): Hono {
  return new Hono()
    .post('/api/login/qr', async (c) => c.json(await controller.loginQr()))
    .post('/api/login/password', validate('json', passwordLoginSchema), async (c) => {
      const { accountName, password } = c.req.valid('json');
      return c.json(await controller.loginPassword(accountName, password));
    })
    .post('/api/login/guard', validate('json', guardCodeSchema), async (c) => {
      const { code } = c.req.valid('json');
      return c.json(await controller.loginGuard(code));
    })
    .delete('/api/login', async (c) => c.json(await controller.loginCancel()))
    .post('/api/logout', async (c) => c.json(await controller.logout()));
}
