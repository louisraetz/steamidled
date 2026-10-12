import { existsSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFileAtomic } from '../storage/atomicWrite.js';

const CONFIG_DIR = join(homedir(), '.steam-idler');
const CONFIG_PATH = join(CONFIG_DIR, 'telegram.json');

export interface TelegramConfig {
  token?: string;
  chatId?: string;
  disabled?: boolean;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

function loadTelegramConfig(): TelegramConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  // Migrate older world-readable files written before 0600 was enforced.
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // Platforms without POSIX perms (or a perms error) — best effort only.
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TelegramConfig;
  } catch {
    return null;
  }
}

// Writes the config file; a read-only config dir is reported, not fatal
function writeTelegramConfig(config: TelegramConfig): void {
  try {
    ensureConfigDir();
    writeFileAtomic(CONFIG_PATH, JSON.stringify(config, null, 2), 0o600);
  } catch (err) {
    console.error(`Could not save ${CONFIG_PATH}: ${(err as Error).message}`);
  }
}

// Marks Telegram as explicitly skipped so we don't re-prompt on next interactive run
export function saveTelegramDisabled(): void {
  writeTelegramConfig({ disabled: true });
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

  // Fire-and-forget — never throws, never blocks the idler. The returned
  // promise settles once the request is done (never rejects) so shutdown can
  // give the final message a chance to land. A non-2xx reply (revoked bot
  // token, wrong chat id) is logged so it does not fail silently.
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
          console.error(`[telegram] send rejected: HTTP ${res.status} — check bot token and chat id`);
        }
      })
      .catch((err) => {
        console.error(`[telegram] send failed: ${(err as Error).message}`);
      });
  }
}

interface GetMeResponse {
  ok: boolean;
  result?: { username?: string };
  description?: string;
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: Array<{ message?: { text?: string; chat?: { id: number } } }>;
  description?: string;
}

const SETUP_FETCH_TIMEOUT_MS = 10_000;
const CHAT_ID_ATTEMPTS = 3;

// Polls getUpdates for the chat that sent /start. Prefers the newest /start so
// a stray message from another chat does not pick a stranger's chat id.
async function fetchChatId(token: string): Promise<number | null> {
  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`, {
    signal: AbortSignal.timeout(SETUP_FETCH_TIMEOUT_MS),
  });
  if (!updatesRes.ok) {
    throw new Error(`Telegram getUpdates failed: HTTP ${updatesRes.status}`);
  }
  const updates = (await updatesRes.json()) as GetUpdatesResponse;
  if (!updates.ok) {
    throw new Error(`getUpdates failed: ${updates.description ?? 'unknown'}`);
  }
  const messages = (updates.result ?? []).map((u) => u.message).filter((m) => m?.chat?.id);
  const started = messages.filter((m) => m?.text?.trim().startsWith('/start'));
  const pick = started[started.length - 1] ?? messages[messages.length - 1];
  return pick?.chat?.id ?? null;
}

export async function runTelegramSetup(): Promise<void> {
  console.log(chalk.cyan.bold('\n  Setup Telegram notifications\n'));
  console.log(chalk.gray('  1. Create a bot via @BotFather and copy its token.'));
  console.log(chalk.gray('  2. Paste the token below.'));
  console.log(chalk.gray('  3. Send /start to your bot in Telegram when prompted.\n'));

  const token = await passwordPrompt({ message: 'Bot token:', mask: '*' });

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(SETUP_FETCH_TIMEOUT_MS),
  });
  if (!meRes.ok) {
    throw new Error(`Telegram getMe failed: HTTP ${meRes.status}`);
  }
  const me = (await meRes.json()) as GetMeResponse;
  if (!me.ok) {
    throw new Error(`Token rejected by Telegram: ${me.description ?? 'unknown error'}`);
  }
  const username = me.result?.username ?? 'your_bot';

  console.log(chalk.green(`\n  ✓ Bot @${username} reachable`));
  console.log(chalk.cyan(`  Send /start to @${username} in Telegram, then press Enter.\n`));

  // Telegram needs a moment to register the message; retry instead of making
  // the user rerun --setup-telegram after one early Enter.
  let chatId: number | null = null;
  for (let attempt = 1; attempt <= CHAT_ID_ATTEMPTS && !chatId; attempt++) {
    await input({
      message: attempt === 1 ? 'Press Enter when done' : 'No /start seen yet — send it, then press Enter',
    });
    chatId = await fetchChatId(token);
  }
  if (!chatId) {
    throw new Error('No /start message received — run --setup-telegram again after sending /start');
  }

  writeTelegramConfig({ token, chatId: String(chatId) });

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: '✅ steamidled notifications enabled.' }),
    signal: AbortSignal.timeout(SETUP_FETCH_TIMEOUT_MS),
  });

  console.log(chalk.green('\n  ✓ Saved to ~/.steam-idler/telegram.json\n'));
}
