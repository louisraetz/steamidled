import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';

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

// Marks Telegram as explicitly skipped so we don't re-prompt on next interactive run
export function saveTelegramDisabled(): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify({ disabled: true }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
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

  // Fire-and-forget — never throws, never blocks the idler
  send(text: string): void {
    if (!this.isConfigured()) return;
    const { token, chatId } = this.config!;
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
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
  result?: Array<{ message?: { chat?: { id: number } } }>;
  description?: string;
}

export async function runTelegramSetup(): Promise<void> {
  console.log(chalk.cyan.bold('\n  Setup Telegram notifications\n'));
  console.log(chalk.gray('  1. Create a bot via @BotFather and copy its token.'));
  console.log(chalk.gray('  2. Paste the token below.'));
  console.log(chalk.gray('  3. Send /start to your bot in Telegram when prompted.\n'));

  const token = await passwordPrompt({ message: 'Bot token:', mask: '*' });

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
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
  await input({ message: 'Press Enter when done' });

  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
  if (!updatesRes.ok) {
    throw new Error(`Telegram getUpdates failed: HTTP ${updatesRes.status}`);
  }
  const updates = (await updatesRes.json()) as GetUpdatesResponse;
  if (!updates.ok) {
    throw new Error(`getUpdates failed: ${updates.description ?? 'unknown'}`);
  }
  const chatId = updates.result?.[updates.result.length - 1]?.message?.chat?.id;
  if (!chatId) {
    throw new Error('No /start message received yet — try again after sending /start to the bot');
  }

  ensureConfigDir();
  writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ token, chatId: String(chatId) }, null, 2),
    { encoding: 'utf-8', mode: 0o600 }
  );

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: '✅ steamidled notifications enabled.' }),
  });

  console.log(chalk.green('\n  ✓ Saved to ~/.steam-idler/telegram.json\n'));
}
