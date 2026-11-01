import type { ApiError } from './types.js';

export type ErrorStatus = 400 | 403 | 404 | 409 | 422 | 429 | 500 | 502;

export class CommandError extends Error {
  constructor(
    readonly status: ErrorStatus,
    message: string,
    readonly hint: string | null = null
  ) {
    super(message);
  }
}

export function apiError(message: string, hint: string | null = null): ApiError {
  return { error: { message, hint } };
}
