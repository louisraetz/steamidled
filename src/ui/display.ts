import Table from 'cli-table3';
import chalk from 'chalk';
import type { IdlingGame } from '../types/index.js';

// Displays the welcome banner
export function showWelcome(): void {
  console.log(chalk.cyan.bold('\n  Steam Game Time Idler\n'));
  console.log(chalk.gray('  Idle your Steam games to collect playtime\n'));
}

// Formats playtime minutes into a human-readable hours string
function formatPlaytimeHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours.toLocaleString()}h`;
}

// Calculates and formats the time gained from idling
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

// Calculates total playtime including time gained from idling
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

// Renders the Game cell: truncated name plus an ∞ marker if exempt
function nameCell(game: IdlingGame, dim = false): string {
  const truncated = game.name.length > 35 ? game.name.substring(0, 32) + '...' : game.name;
  const base = dim ? chalk.gray(truncated) : truncated;
  return game.nextPauseAtMs === null ? `${base} ${chalk.cyan('∞')}` : base;
}

// Renders the Status cell for cooldown games, with a coarse remaining-time hint
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

// Displays a formatted table showing the status of all idling games
export function showIdlingStatus(
  idlingGames: IdlingGame[],
  pausedGames: IdlingGame[] = [],
  pausingGames: IdlingGame[] = []
): void {
  console.clear();

  console.log(chalk.cyan.bold('\n  Steam Game Time Idler - Idling\n'));

  const table = new Table({
    head: [
      chalk.cyan('Game'),
      chalk.cyan('Total'),
      chalk.cyan('Gained'),
      chalk.cyan('Status'),
    ],
    colWidths: [38, 10, 12, 14],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const game of idlingGames) {
    table.push([
      nameCell(game),
      getTotalPlaytime(game, false),
      chalk.green(formatGainedTime(game, false)),
      chalk.green('Idling'),
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
  console.log(chalk.gray("  Press 'E' to edit games | 'Q' to quit\n"));
}

// Displays a success message after login
export function showLoginSuccess(accountName: string): void {
  console.log(chalk.green(`\n  Logged in as ${chalk.bold(accountName)}\n`));
}

// Displays a login error message
export function showLoginError(error: string): void {
  console.log(chalk.red(`\n  Login failed: ${error}\n`));
}

// Displays a goodbye message on exit
export function showGoodbye(): void {
  console.log(chalk.cyan('\n  Goodbye! Happy idling!\n'));
}

// Displays an error message
export function showError(message: string): void {
  console.log(chalk.red(`\n  Error: ${message}\n`));
}

// Displays an informational message
export function showInfo(message: string): void {
  console.log(chalk.blue(`\n  ${message}\n`));
}
