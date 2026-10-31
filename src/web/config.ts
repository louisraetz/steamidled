import { WEB_DEFAULT_HOST, WEB_DEFAULT_PORT } from '../constants.js';

export interface ListenProblem {
  message: string;
  hint: string;
}

export function readWebPort(): number | null {
  const raw = process.env.STEAMIDLED_WEB_PORT;
  if (raw === undefined || raw.trim() === '') return WEB_DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

export function readWebHost(): string {
  return process.env.STEAMIDLED_WEB_HOST?.trim() || WEB_DEFAULT_HOST;
}

export function displayUrl(host: string, port: number): string {
  if (host === '0.0.0.0' || host === '::') return `http://localhost:${port}`;
  if (host.includes(':')) return `http://[${host}]:${port}`;
  return `http://${host}:${port}`;
}

export function listenProblem(code: string | undefined, host: string, port: number): ListenProblem {
  if (code === 'EADDRINUSE') {
    return {
      message: `Port ${port} is already in use`,
      hint: 'Another steamidled --web may be running. Stop it, or set STEAMIDLED_WEB_PORT to a free port.',
    };
  }
  if (code === 'EACCES') {
    return {
      message: `No permission to listen on port ${port}`,
      hint: 'Use a port above 1023 with STEAMIDLED_WEB_PORT.',
    };
  }
  return {
    message: `Couldn't listen on ${host}:${port}`,
    hint: 'Check STEAMIDLED_WEB_HOST and STEAMIDLED_WEB_PORT.',
  };
}
