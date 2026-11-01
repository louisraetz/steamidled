import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdaptorServer } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { log } from '../logging/logger.js';
import { apiError, CommandError } from './errors.js';
import { csrfGuard, hostAllowlist, HostPolicy } from './middleware.js';
import { gameRoutes } from './routes/games.js';
import { healthRoutes } from './routes/health.js';
import { libraryRoutes } from './routes/library.js';
import { loginRoutes } from './routes/login.js';
import { logRoutes } from './routes/logs.js';
import { settingsRoutes } from './routes/settings.js';
import { stateRoutes } from './routes/state.js';
import { telegramRoutes } from './routes/telegram.js';
import type { WebController } from './controller.js';

const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const INDEX_PATH = join(PUBLIC_ROOT, 'index.html');
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const MISSING_ASSETS_TEXT =
  'The steamidled web GUI is not built. Run pnpm build, then restart steamidled. The API under /api keeps working.';

let server: Server | null = null;

function mountStatic(app: Hono): void {
  if (!existsSync(INDEX_PATH)) {
    log.warn('web', 'Web assets not found in dist/public', { hint: 'Run pnpm build.' });
    app.get('*', (c) => c.text(MISSING_ASSETS_TEXT, 503));
    return;
  }
  app.use('*', async (c, next) => {
    await next();
    if (c.req.path.startsWith('/assets/') && c.res.status === 200) {
      c.res.headers.set('Cache-Control', IMMUTABLE_CACHE);
    } else if (c.res.headers.get('Content-Type')?.startsWith('text/html')) {
      c.res.headers.set('Cache-Control', 'no-cache');
    }
  });
  app.use('*', serveStatic({ root: PUBLIC_ROOT }));
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/assets/')) return c.text('Not found', 404);
    return c.html(await readFile(INDEX_PATH, 'utf-8'));
  });
}

export function createApp(controller: WebController): Hono {
  const app = new Hono();

  const hostPolicy = new HostPolicy();
  app.use('*', hostAllowlist(hostPolicy));
  app.use('/api/*', csrfGuard(hostPolicy));

  app.route('/', healthRoutes());
  app.route('/', stateRoutes(controller));
  app.route('/', logRoutes());
  app.route('/', libraryRoutes(controller));
  app.route('/', loginRoutes(controller));
  app.route('/', telegramRoutes(controller));
  app.route('/', settingsRoutes(controller));
  app.route('/', gameRoutes(controller));
  app.all('/api/*', (c) => c.json(apiError('Unknown API route.', null), 404));

  mountStatic(app);

  app.onError((err, c) => {
    if (err instanceof CommandError) {
      if (err.status >= 500) {
        log.error('web', `${c.req.method} ${c.req.path} failed: ${err.message}`, { hint: err.hint ?? undefined });
      }
      return c.json(apiError(err.message, err.hint), err.status);
    }
    if (err instanceof HTTPException && err.status < 500) {
      return c.json(apiError(err.message || 'Invalid request.', null), 400);
    }
    log.error('web', `${c.req.method} ${c.req.path} failed`, {
      cause: err,
      hint: 'Try again. If it keeps failing, restart steamidled.',
    });
    return c.json(apiError('Something went wrong in steamidled.', 'Check the daemon log.'), 500);
  });

  return app;
}

export function startWebServer(app: Hono, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const instance = createAdaptorServer({ fetch: app.fetch, overrideGlobalObjects: false }) as Server;
    instance.once('error', reject);
    instance.listen(port, host, () => {
      instance.off('error', reject);
      instance.on('error', (err) => {
        log.error('web', 'The web server reported an error', { cause: err });
      });
      server = instance;
      resolve();
    });
  });
}

export function stopWebServer(): void {
  const instance = server;
  server = null;
  if (!instance) return;
  instance.closeAllConnections();
  instance.close();
}
