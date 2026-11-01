import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import { loadTelegramConfig, withStoredNotify, writeTelegramConfig } from './telegram.js';

interface GetMeResponse {
  ok: boolean;
  result?: { username?: string };
  description?: string;
}

interface TelegramChat {
  id: number;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: Array<{ message?: { text?: string; chat?: TelegramChat } }>;
  description?: string;
}

export interface TelegramChatInfo {
  chatId: number;
  chatLabel: string;
}

export interface TelegramStatus {
  state: 'off' | 'connected';
  botUsername: string | null;
  chatLabel: string | null;
}

export class TelegramRejectedError extends Error {}

const SETUP_FETCH_TIMEOUT_MS = 10_000;
const CHAT_ID_ATTEMPTS = 3;
const REJECTED_STATUSES = new Set([401, 403, 404]);
const CONFIRMATION_TEXT = '✅ steamidled notifications enabled.';

const botUsernames = new Map<string, string | null>();

export async function verifyBotToken(token: string): Promise<string | null> {
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(SETUP_FETCH_TIMEOUT_MS),
  });
  if (!meRes.ok) {
    const message = `Telegram getMe failed: HTTP ${meRes.status}`;
    throw REJECTED_STATUSES.has(meRes.status) ? new TelegramRejectedError(message) : new Error(message);
  }
  const me = (await meRes.json()) as GetMeResponse;
  if (!me.ok) {
    throw new TelegramRejectedError(`Token rejected by Telegram: ${me.description ?? 'unknown error'}`);
  }
  const username = me.result?.username ?? null;
  botUsernames.set(token, username);
  return username;
}

function chatLabelOf(chat: TelegramChat): string {
  if (chat.username) return `@${chat.username}`;
  if (chat.title) return chat.title;
  const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
  return fullName || `chat ${chat.id}`;
}

export async function fetchChatId(token: string): Promise<TelegramChatInfo | null> {
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
  const chat = pick?.chat;
  if (!chat?.id) return null;
  return { chatId: chat.id, chatLabel: chatLabelOf(chat) };
}

export function saveTelegramConfig(config: { token: string; chatId: number; chatLabel?: string }): boolean {
  return writeTelegramConfig(
    withStoredNotify({
      token: config.token,
      chatId: String(config.chatId),
      chatLabel: config.chatLabel,
    })
  );
}

export async function sendTelegramConfirmation(token: string, chatId: number): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: CONFIRMATION_TEXT }),
    signal: AbortSignal.timeout(SETUP_FETCH_TIMEOUT_MS),
  });
}

export function readTelegramStatus(): TelegramStatus {
  const config = loadTelegramConfig();
  if (!config?.token || !config.chatId || config.disabled) {
    return { state: 'off', botUsername: null, chatLabel: null };
  }
  return {
    state: 'connected',
    botUsername: botUsernames.get(config.token) ?? null,
    chatLabel: config.chatLabel ?? `chat ${config.chatId}`,
  };
}

export async function resolveBotUsername(): Promise<string | null> {
  const config = loadTelegramConfig();
  if (!config?.token || !config.chatId || config.disabled) return null;
  const cached = botUsernames.get(config.token);
  if (cached !== undefined) return cached;
  try {
    return await verifyBotToken(config.token);
  } catch {
    return null;
  }
}

export async function runTelegramSetup(): Promise<void> {
  console.log(chalk.cyan.bold('\n  Setup Telegram notifications\n'));
  console.log(chalk.gray('  1. Create a bot via @BotFather and copy its token.'));
  console.log(chalk.gray('  2. Paste the token below.'));
  console.log(chalk.gray('  3. Send /start to your bot in Telegram when prompted.\n'));

  const token = await passwordPrompt({ message: 'Bot token:', mask: '*' });

  const username = (await verifyBotToken(token)) ?? 'your_bot';

  console.log(chalk.green(`\n  ✓ Bot @${username} reachable`));
  console.log(chalk.cyan(`  Send /start to @${username} in Telegram, then press Enter.\n`));

  let chat: TelegramChatInfo | null = null;
  for (let attempt = 1; attempt <= CHAT_ID_ATTEMPTS && !chat; attempt++) {
    await input({
      message: attempt === 1 ? 'Press Enter when done' : 'No /start seen yet — send it, then press Enter',
    });
    chat = await fetchChatId(token);
  }
  if (!chat) {
    throw new Error('No /start message received — run --setup-telegram again after sending /start');
  }

  saveTelegramConfig({ token, chatId: chat.chatId, chatLabel: chat.chatLabel });

  await sendTelegramConfirmation(token, chat.chatId);

  console.log(chalk.green('\n  ✓ Saved to ~/.steam-idler/telegram.json\n'));
}
