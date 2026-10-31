import Table from 'cli-table3';
import chalk from 'chalk';
import type { IdlingGame } from '../types/index.js';

const NAME_COL_WIDTH = 38;
const NAME_MAX_LENGTH = NAME_COL_WIDTH - 2;
const EXEMPT_SUFFIX = ' ∞';

export interface StatusOptions {
  waitingReason?: string | null;
  playingBlocked?: boolean;
  showKeyHints?: boolean;
}

export function showWelcome(version?: string): void {
  const suffix = version ? chalk.gray(` v${version}`) : '';
  console.log(chalk.cyan.bold('\n  Steam Game Time Idler') + suffix + '\n');
  console.log(chalk.gray('  Idle your Steam games to collect playtime\n'));
}

function formatPlaytimeHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours.toLocaleString()}h`;
}

function formatGainedTime(game: IdlingGame, isPaused: boolean): string {
  const now = new Date();
  let totalMs = game.accumulatedMs;

  if (!isPaused) {
    totalMs += now.getTime() - game.startTime.getTime();
  }

  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `+${hours}h ${minutes}m`;
  }
  return `+${minutes}m`;
}

function getTotalPlaytime(game: IdlingGame, isPaused: boolean): string {
  const now = new Date();
  let gainedMs = game.accumulatedMs;

  if (!isPaused) {
    gainedMs += now.getTime() - game.startTime.getTime();
  }

  const gainedMinutes = Math.floor(gainedMs / (1000 * 60));
  const totalMinutes = game.initialPlaytime + gainedMinutes;

  return formatPlaytimeHours(totalMinutes);
}

function nameCell(game: IdlingGame, dim = false): string {
  const isExempt = game.nextPauseAtMs === null;
  const maxLength = isExempt ? NAME_MAX_LENGTH - EXEMPT_SUFFIX.length : NAME_MAX_LENGTH;
  const truncated =
    game.name.length > maxLength ? game.name.substring(0, maxLength - 3) + '...' : game.name;
  const base = dim ? chalk.gray(truncated) : truncated;
  return isExempt ? `${base} ${chalk.cyan('∞')}` : base;
}

function formatCooldownLabel(pauseUntil: Date | null): string {
  if (!pauseUntil) return 'Cooldown';
  const ms = pauseUntil.getTime() - Date.now();
  if (ms <= 0) return 'Cooldown';
  const totalMinutes = ms / 60000;
  if (totalMinutes >= 24 * 60) {
    return `Cooldown ${Math.floor(totalMinutes / (24 * 60))}d`;
  }
  if (totalMinutes >= 60) {
    return `Cooldown ${Math.floor(totalMinutes / 60)}h`;
  }
  return `Cooldown ${Math.floor(totalMinutes)}m`;
}

export function showIdlingStatus(
  idlingGames: IdlingGame[],
  pausedGames: IdlingGame[] = [],
  pausingGames: IdlingGame[] = [],
  options: StatusOptions = {}
): void {
  const isWaiting = !!options.waitingReason;
  const isBlocked = !!options.playingBlocked;
  const frozen = isWaiting || isBlocked;

  console.clear();

  if (isWaiting) {
    console.log(chalk.yellow.bold('\n  Steam Game Time Idler — WAITING TO RESUME\n'));
    console.log(chalk.yellow(`  ${options.waitingReason}. Auto-retrying with backoff.\n`));
  } else if (isBlocked) {
    console.log(chalk.yellow.bold('\n  Steam Game Time Idler — BLOCKED\n'));
    console.log(
      chalk.yellow(
        '  A game is being played on this account elsewhere. Idling resumes when it stops.\n'
      )
    );
  } else {
    console.log(chalk.cyan.bold('\n  Steam Game Time Idler - Idling\n'));
  }

  const table = new Table({
    head: [
      chalk.cyan('Game'),
      chalk.cyan('Total'),
      chalk.cyan('Gained'),
      chalk.cyan('Status'),
    ],
    colWidths: [NAME_COL_WIDTH, 10, 12, 14],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  const idlingStatus = isWaiting
    ? chalk.yellow('Waiting')
    : isBlocked
    ? chalk.yellow('Blocked')
    : chalk.green('Idling');

  for (const game of idlingGames) {
    table.push([
      nameCell(game),
      getTotalPlaytime(game, frozen),
      chalk.green(formatGainedTime(game, frozen)),
      idlingStatus,
    ]);
  }

  for (const game of pausedGames) {
    table.push([
      nameCell(game, true),
      chalk.gray(getTotalPlaytime(game, true)),
      chalk.gray(formatGainedTime(game, true)),
      chalk.yellow('Paused'),
    ]);
  }

  for (const game of pausingGames) {
    table.push([
      nameCell(game, true),
      chalk.gray(getTotalPlaytime(game, true)),
      chalk.gray(formatGainedTime(game, true)),
      chalk.cyan(formatCooldownLabel(game.pauseUntil)),
    ]);
  }

  console.log(table.toString());

  const parts: string[] = [];
  if (pausedGames.length > 0) parts.push(chalk.yellow(`${pausedGames.length} paused`));
  if (pausingGames.length > 0) parts.push(chalk.cyan(`${pausingGames.length} cooling down`));
  const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : '';

  console.log(
    chalk.green(`\n  Idling ${chalk.bold(idlingGames.length)} game${idlingGames.length !== 1 ? 's' : ''}`) +
      suffix +
      '\n'
  );
  if (!process.stdout.isTTY || options.showKeyHints === false) return;
  if (isWaiting) {
    console.log(chalk.gray("  Press 'Q' to quit — edit disabled while waiting\n"));
  } else {
    console.log(chalk.gray("  Press 'E' to edit games | 'Q' to quit\n"));
  }
}

export function showLoginSuccess(accountName: string): void {
  console.log(chalk.green(`\n  Logged in as ${chalk.bold(accountName)}\n`));
}

export function showLoginError(error: string): void {
  console.log(chalk.red(`\n  Login failed: ${error}\n`));
}

export function showGoodbye(): void {
  console.log(chalk.cyan('\n  Goodbye! Happy idling!\n'));
}

export function showError(message: string): void {
  console.log(chalk.red(`\n  Error: ${message}\n`));
}
