export { LOG_BUFFER_SIZE, MAX_IDLE_GAMES } from './limits.js';

export const IS_WEB = process.argv.includes('--web');
export const IS_HEADLESS = process.argv.includes('--headless') || IS_WEB;

export const WEB_DEFAULT_PORT = 4821;
export const WEB_DEFAULT_HOST = '127.0.0.1';

export const INVALID_TOKEN_ERESULTS = new Set<number>([5, 15, 26, 27, 126]);
export const TERMINAL_ERESULTS = new Set<number>([
  5, 15, 26, 27, 126,
  17, 43, 51, 69, 73, 95, 114,
  7, 119, 120,
]);
export const RATE_LIMIT_ERESULTS = new Set<number>([84, 87]);
export const TAKEOVER_ERESULTS = new Set<number>([6, 34]);
