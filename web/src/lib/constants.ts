import type { LogEntry } from '@/lib/types';

export { LOG_BUFFER_SIZE, MAX_IDLE_GAMES } from '../../../src/limits';

export const GITHUB_URL = 'https://github.com/louisraetz/steamidled';
export const BOTFATHER_URL = 'https://t.me/BotFather';
export const SHARED_TOTAL_TITLE = "Steam doesn't report playtime for family-shared games.";
export const CLOCK_TICK_MS = 1000;
export const MINUTE_MS = 60_000;
export const STEAM_CAPSULE_SIZE = { width: 231, height: 87 };
export const STEAM_CAPSULE_URL = 'https://shared.steamstatic.com/store_item_assets/steam/apps/{appid}/capsule_231x87.jpg';
export const STREAM_RETRY_BASE_MS = 2000;
export const STREAM_RETRY_MAX_MS = 30_000;
export const EMPTY_IDS: number[] = [];
export const EMPTY_LOGS: LogEntry[] = [];
export const COPY_FEEDBACK_MS = 1500;
export const SELECTION_BATCH_MS = 800;
export const UNDO_DURATION_MS = 5000;
export const SELECTION_ERROR_PREFIX = "Couldn't update the games.";
export const AUTO_START_SAVE_ERROR = "Couldn't save the auto-start games. Check that ~/.steam-idler is writable.";
export const AUTO_START_TOOLTIP = 'Start this game automatically when steamidled starts';
export const NO_COOLDOWN_SAVE_ERROR = "Couldn't save the no-cooldown game. Check that ~/.steam-idler is writable.";
export const PICKER_TOASTER_ID = 'picker';
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
export const HOURS_PER_DAY = 24;
export const NBSP = '\u00a0';
export const CHUNK_RELOAD_KEY = 'steamidled:chunk-reload';
export const CHUNK_RELOAD_WINDOW_MS = 10_000;
