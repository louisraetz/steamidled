import type { LogEntry } from '@/lib/types';

export { LOG_BUFFER_SIZE, MAX_IDLE_GAMES } from '../../../src/limits';

export const GITHUB_URL = 'https://github.com/louisraetz/steamidled';
export const BOTFATHER_URL = 'https://t.me/BotFather';
export const SHARED_TOTAL_TITLE = "Steam doesn't report playtime for family-shared games.";
export const CLOCK_TICK_MS = 1000;
export const STREAM_RETRY_BASE_MS = 2000;
export const STREAM_RETRY_MAX_MS = 30_000;
export const EMPTY_IDS: number[] = [];
export const EMPTY_LOGS: LogEntry[] = [];
export const COPY_FEEDBACK_MS = 1500;
