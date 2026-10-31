import { Hono } from 'hono';
import { getLogEntries } from '../../logging/logger.js';

export function logRoutes(): Hono {
  return new Hono().get('/api/logs', (c) => c.json(getLogEntries()));
}
