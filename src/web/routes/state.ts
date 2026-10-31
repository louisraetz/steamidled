import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { logEvents } from '../../logging/logger.js';
import type { LogEntry } from '../types.js';
import type { WebController } from '../controller.js';

const PING_INTERVAL_MS = 25_000;

export function stateRoutes(controller: WebController): Hono {
  return new Hono()
    .get('/api/state', (c) => c.json(controller.snapshot()))
    .post('/api/retry', async (c) => c.json(await controller.retry()))
    .get('/api/events', (c) => {
      c.header('X-Accel-Buffering', 'no');
      return streamSSE(c, async (stream) => {
        const sendState = (): void => {
          void stream.writeSSE({ event: 'state', data: JSON.stringify(controller.snapshot()) });
        };
        const sendLog = (entry: LogEntry): void => {
          void stream.writeSSE({ event: 'log', id: String(entry.id), data: JSON.stringify(entry) });
        };
        const ping = setInterval(() => {
          void stream.writeSSE({ event: 'ping', data: '' });
        }, PING_INTERVAL_MS);

        controller.events.on('state', sendState);
        logEvents.on('entry', sendLog);
        const closed = new Promise<void>((resolve) => {
          stream.onAbort(() => {
            clearInterval(ping);
            controller.events.off('state', sendState);
            logEvents.off('entry', sendLog);
            resolve();
          });
        });

        sendState();
        await closed;
      });
    });
}
