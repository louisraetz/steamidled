import { isIP } from 'node:net';
import type { MiddlewareHandler } from 'hono';
import { log } from '../logging/logger.js';
import { apiError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD']);

function parseHostList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) =>
      entry
        .trim()
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
    )
    .filter((entry) => entry.length > 0);
}

function hostnameOf(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'));
  return host.replace(/:\d+$/, '');
}

export class HostPolicy {
  private readonly configured = new Set([
    ...parseHostList(process.env.COOLIFY_FQDN),
    ...parseHostList(process.env.COOLIFY_URL),
    ...parseHostList(process.env.STEAMIDLED_WEB_ALLOWED_HOSTS),
  ]);

  allows(hostname: string): boolean {
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
    if (isIP(hostname) !== 0) return true;
    return this.configured.has(hostname);
  }
}

function originHostname(origin: string): string | null {
  try {
    return hostnameOf(new URL(origin).host);
  } catch {
    return null;
  }
}

function warnOnce(seen: Set<string>, key: string, message: string, hint: string): void {
  if (seen.has(key)) return;
  seen.add(key);
  log.warn('web', message, { hint });
}

export function hostAllowlist(policy: HostPolicy): MiddlewareHandler {
  const warned = new Set<string>();
  return async (c, next) => {
    const hostname = hostnameOf(c.req.header('host') ?? '');
    if (policy.allows(hostname)) {
      await next();
      return;
    }
    warnOnce(
      warned,
      hostname,
      `Rejected a request for host "${hostname}"`,
      'Add the host to STEAMIDLED_WEB_ALLOWED_HOSTS if it is yours.'
    );
    return c.text('Host not allowed. Add it to STEAMIDLED_WEB_ALLOWED_HOSTS.', 403);
  };
}

export function csrfGuard(policy: HostPolicy): MiddlewareHandler {
  const warned = new Set<string>();
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) {
      await next();
      return;
    }
    const host = (c.req.header('host') ?? '').toLowerCase();
    if (c.req.header('x-steamidled') !== '1') {
      warnOnce(
        warned,
        `header:${host}`,
        `Blocked a ${c.req.method} ${c.req.path} request without the steamidled header`,
        'Only the steamidled web GUI may change state. Check for scripts posting to the daemon.'
      );
      return c.json(apiError('Request blocked.', 'Use the steamidled web GUI to change settings.'), 403);
    }
    const origin = c.req.header('origin');
    if (origin) {
      const hostname = originHostname(origin);
      if (hostname === null || !policy.allows(hostname)) {
        warnOnce(
          warned,
          `origin:${origin}`,
          `Blocked a cross-site request from ${origin}`,
          'Add the domain you open the GUI on to STEAMIDLED_WEB_ALLOWED_HOSTS.'
        );
        return c.json(apiError('Request blocked.', 'Add this domain to STEAMIDLED_WEB_ALLOWED_HOSTS.'), 403);
      }
    }
    await next();
  };
}
