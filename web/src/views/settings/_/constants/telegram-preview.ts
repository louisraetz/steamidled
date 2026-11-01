export const MESSAGE_SEPARATOR = ' — ';
export const EMPTY_SESSION_GAMES = 3;
export const REPORT_GAME_LINES = 2;
export const HOUR_MS = 3_600_000;

export const MESSAGES = {
  started: '▶️ Idling started',
  paused: '⏸️ Idling paused',
  pausedReason: 'connection lost. Auto-retrying.',
  resumed: '▶️ Idling resumed after 4m',
  flush: '🔄 flush',
  flushDetail: 'playtime committed, session refreshed',
  zombie: '⚠️ Zombie session',
  zombieDetail: 'playtime not committing after a relog. Forcing reconnect.',
  report: '📊 Daily idling report',
  stopped: '🛑 Idling stopped',
  stoppedDetail: 'no stored credentials, cannot auto-resume.',
  more: '…',
};

export const ZOMBIE_META = 'only when needed';
export const CHAT_PREVIEW_LABEL = 'Preview of your Telegram messages';
export const ALWAYS_SENT_LABEL = 'Always sent';
export const TEASER_TITLE = "What you'll get";
export const CHAT_TITLE = 'Your chat';
