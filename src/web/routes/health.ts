import { Hono } from 'hono';

export function healthRoutes(): Hono {
  return new Hono().get('/healthz', (c) => c.json({ ok: true }));
}
