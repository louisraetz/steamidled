import { existsSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from '../storage/atomicWrite.js';
import { log } from '../logging/logger.js';
import type { TelegramNotifyKind, TelegramNotifyPrefs } from '../web/types.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CONFIG_PATH = join(CONFIG_DIR, 'telegram.json');

const SEND_TIMEOUT_MS = 5000;
export const TEST_MESSAGE = '🧪 steamidled test message';

export const DEFAULT_NOTIFY_PREFS: TelegramNotifyPrefs = {
  lifecycle: true,
  pauseResume: true,
  flush: true,
  zombie: true,
  dailyReport: true,
};

export interface TelegramConfig {
  token?: string;
  chatId?: string;
  chatLabel?: string;
  disabled?: boolean;
  notify?: Partial<TelegramNotifyPrefs>;
}

export interface SendResult {
  ok: boolean;
  status: number | null;
}

export type NotifyPrefsUpdate = 'saved' | 'not-connected' | 'unwritable';

export function sendTestMessage(): Promise<SendResult> {
  return new TelegramNotifier().sendChecked(TEST_MESSAGE);
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

export function loadTelegramConfig(): TelegramConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TelegramConfig;
  } catch {
    return null;
  }
}

export function writeTelegramConfig(config: TelegramConfig): boolean {
  try {
    ensureConfigDir();
    writeFileAtomic(CONFIG_PATH, JSON.stringify(config, null, 2), 0o600);
    return true;
  } catch (err) {
    log.error('storage', `Could not save ${CONFIG_PATH}`, {
      cause: err,
      hint: 'Check that ~/.steam-idler is writable.',
      interactive: () => console.error(`Could not save ${CONFIG_PATH}: ${(err as Error).message}`),
    });
    return false;
  }
}

export function notifyPrefsOf(config: TelegramConfig | null): TelegramNotifyPrefs {
  const stored = config?.notify ?? {};
  return {
    lifecycle: stored.lifecycle !== false,
    pauseResume: stored.pauseResume !== false,
    flush: stored.flush !== false,
    zombie: stored.zombie !== false,
    dailyReport: stored.dailyReport !== false,
  };
}

export function withStoredNotify(config: TelegramConfig): TelegramConfig {
  const notify = loadTelegramConfig()?.notify;
  return notify ? { ...config, notify } : config;
}

export function saveTelegramDisabled(): boolean {
  return writeTelegramConfig(withStoredNotify({ disabled: true }));
}

export function setNotifyPrefs(partial: Partial<TelegramNotifyPrefs>): NotifyPrefsUpdate {
  const config = loadTelegramConfig();
  if (!config?.token || !config.chatId || config.disabled) return 'not-connected';
  const notify = { ...notifyPrefsOf(config), ...partial };
  return writeTelegramConfig({ ...config, notify }) ? 'saved' : 'unwritable';
}

export class TelegramNotifier {
  private config: TelegramConfig | null = null;

  constructor() {
    this.reload();
  }

  reload(): void {
    this.config = loadTelegramConfig();
  }

  isConfigured(): boolean {
    return !!this.config?.token && !!this.config?.chatId && !this.config?.disabled;
  }

  hasFile(): boolean {
    return this.config !== null;
  }

  notifyPrefs(): TelegramNotifyPrefs {
    return notifyPrefsOf(this.config);
  }

  private post(text: string): Promise<Response> {
    const { token, chatId } = this.config!;
    return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  }

  async sendChecked(text: string): Promise<SendResult> {
    if (!this.isConfigured()) return { ok: false, status: null };
    try {
      const res = await this.post(text);
      if (!res.ok) {
        log.warn('telegram', `Send rejected: HTTP ${res.status}`, {
          hint: 'Check the bot token and chat id in Settings or with --setup-telegram.',
        });
      }
      return { ok: res.ok, status: res.status };
    } catch (err) {
      log.warn('telegram', 'Send failed', { cause: err, hint: "Check the server's internet connection." });
      return { ok: false, status: null };
    }
  }

  send(text: string, kind: TelegramNotifyKind): Promise<void> {
    if (!this.isConfigured()) return Promise.resolve();
    if (kind !== 'critical' && !this.notifyPrefs()[kind]) return Promise.resolve();
    return this.post(text)
      .then((res) => {
        if (!res.ok) {
          log.warn('telegram', `Send rejected: HTTP ${res.status}`, {
            hint: 'Check the bot token and chat id in Settings or with --setup-telegram.',
            interactive: () =>
              console.error(`[telegram] send rejected: HTTP ${res.status} — check bot token and chat id`),
          });
        }
      })
      .catch((err) => {
        log.warn('telegram', 'Send failed', {
          cause: err,
          hint: "Check the server's internet connection.",
          interactive: () => console.error(`[telegram] send failed: ${(err as Error).message}`),
        });
      });
  }
}
