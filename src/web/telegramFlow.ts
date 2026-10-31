import { log } from '../logging/logger.js';
import { saveTelegramDisabled, type TelegramNotifier } from '../notifications/telegram.js';
import {
  fetchChatId,
  readTelegramStatus,
  resolveBotUsername,
  saveTelegramConfig,
  sendTelegramConfirmation,
  TelegramRejectedError,
  verifyBotToken,
  type TelegramChatInfo,
  type TelegramStatus,
} from '../notifications/telegramSetup.js';
import { CommandError } from './errors.js';
import type { TelegramConfirmResult, TelegramSnapshot } from './types.js';

const OFF: TelegramStatus = { state: 'off', botUsername: null, chatLabel: null };

function unreachable(): CommandError {
  return new CommandError(500, "Couldn't reach Telegram.", "Check the server's internet connection, then try again.");
}

function unwritable(): CommandError {
  return new CommandError(500, "Couldn't save the Telegram settings.", 'Check that ~/.steam-idler is writable.');
}

export class TelegramFlow {
  private status: TelegramStatus = OFF;
  private pending: { token: string; botUsername: string | null } | null = null;

  constructor(
    private readonly notifier: TelegramNotifier,
    private readonly onChange: () => void
  ) {}

  snapshot(): TelegramSnapshot {
    if (this.pending) {
      return { state: 'awaiting-start', botUsername: this.pending.botUsername, chatLabel: null };
    }
    return this.status;
  }

  load(): void {
    this.status = readTelegramStatus();
    this.onChange();
    if (this.status.state !== 'connected' || this.status.botUsername !== null) return;
    void resolveBotUsername()
      .then((botUsername) => {
        if (this.status.state !== 'connected' || this.status.botUsername !== null) return;
        this.status = { ...this.status, botUsername };
        this.onChange();
      })
      .catch((err: unknown) => {
        log.warn('telegram', "Couldn't look up the bot name", { cause: err });
      });
  }

  async submitToken(token: string): Promise<void> {
    let botUsername: string | null;
    try {
      botUsername = await verifyBotToken(token);
    } catch (err) {
      if (err instanceof TelegramRejectedError) {
        throw new CommandError(422, "Telegram didn't accept this token.", 'Copy it again from @BotFather.');
      }
      log.warn('telegram', "Couldn't reach Telegram", { cause: err });
      throw unreachable();
    }
    this.pending = { token, botUsername };
    const botLabel = botUsername ? `@${botUsername}` : 'The bot';
    log.info('telegram', `${botLabel} is reachable, waiting for /start`);
    this.onChange();
  }

  async confirm(): Promise<TelegramConfirmResult> {
    const pending = this.pending;
    if (!pending) {
      throw new CommandError(409, 'Paste a bot token first.', null);
    }
    let chat: TelegramChatInfo | null;
    try {
      chat = await fetchChatId(pending.token);
    } catch (err) {
      log.warn('telegram', "Couldn't read messages from Telegram", { cause: err });
      throw unreachable();
    }
    if (!chat || this.pending !== pending) return { status: 'pending' };
    if (!saveTelegramConfig({ token: pending.token, chatId: chat.chatId, chatLabel: chat.chatLabel })) {
      throw unwritable();
    }
    try {
      await sendTelegramConfirmation(pending.token, chat.chatId);
    } catch (err) {
      log.warn('telegram', "Couldn't send the confirmation message", { cause: err });
    }
    this.notifier.reload();
    this.pending = null;
    this.status = { state: 'connected', botUsername: pending.botUsername, chatLabel: chat.chatLabel };
    log.info('telegram', `Telegram notifications on, messages go to ${chat.chatLabel}`);
    this.onChange();
    return { status: 'connected' };
  }

  disable(): void {
    if (this.pending) {
      this.pending = null;
      this.onChange();
      return;
    }
    if (this.status.state !== 'connected') return;
    if (!saveTelegramDisabled()) throw unwritable();
    this.notifier.reload();
    this.status = OFF;
    log.info('telegram', 'Telegram notifications off');
    this.onChange();
  }
}
