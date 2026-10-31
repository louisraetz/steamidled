import { existsSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from '../storage/atomicWrite.js';
import { log } from '../logging/logger.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CONFIG_PATH = join(CONFIG_DIR, 'telegram.json');

export interface TelegramConfig {
  token?: string;
  chatId?: string;
  chatLabel?: string;
  disabled?: boolean;
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

export function saveTelegramDisabled(): boolean {
  return writeTelegramConfig({ disabled: true });
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

  send(text: string): Promise<void> {
    if (!this.isConfigured()) return Promise.resolve();
    const { token, chatId } = this.config!;
    return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(5000),
    })
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
