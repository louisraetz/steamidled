import type { ApiError, DaemonSnapshot, LibraryGame, LogEntry, TelegramConfirmResult } from '@/lib/types';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly hint: string | null
  ) {
    super(message);
  }
}

async function readError(response: Response): Promise<ApiRequestError> {
  const payload = (await response.json().catch(() => null)) as ApiError | null;
  const message = payload?.error.message ?? `steamidled answered with HTTP ${response.status}.`;
  return new ApiRequestError(response.status, message, payload?.error.hint ?? null);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-Steamidled': '1' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, "Can't reach steamidled.", 'Check that the daemon runs with --web.');
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export const api = {
  state: () => request<DaemonSnapshot>('GET', '/api/state'),
  library: () => request<LibraryGame[]>('GET', '/api/library'),
  logs: () => request<LogEntry[]>('GET', '/api/logs'),
  setSelection: (appIds: number[]) => request<DaemonSnapshot>('PUT', '/api/selection', { appIds }),
  stopIdling: () => request<DaemonSnapshot>('POST', '/api/idling/stop'),
  startFavorites: () => request<DaemonSnapshot>('POST', '/api/idling/start-favorites'),
  setFavorite: (appId: number, favorite: boolean) =>
    request<DaemonSnapshot>('PUT', `/api/favorites/${appId}`, { favorite }),
  setExempt: (appId: number | null) => request<DaemonSnapshot>('PUT', '/api/exempt', { appId }),
  loginQr: () => request<DaemonSnapshot>('POST', '/api/login/qr'),
  loginPassword: (accountName: string, password: string) =>
    request<DaemonSnapshot>('POST', '/api/login/password', { accountName, password }),
  loginGuard: (code: string) => request<DaemonSnapshot>('POST', '/api/login/guard', { code }),
  cancelLogin: () => request<DaemonSnapshot>('DELETE', '/api/login'),
  logout: () => request<DaemonSnapshot>('POST', '/api/logout'),
  retry: () => request<DaemonSnapshot>('POST', '/api/retry'),
  telegramToken: (token: string) => request<DaemonSnapshot>('POST', '/api/telegram/token', { token }),
  telegramConfirm: () => request<TelegramConfirmResult>('POST', '/api/telegram/confirm'),
  telegramDisable: () => request<DaemonSnapshot>('DELETE', '/api/telegram'),
};
