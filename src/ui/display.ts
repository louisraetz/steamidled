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

// Displays a formatted table showing the status of all idling games
export function showIdlingStatus(
  idlingGames: IdlingGame[],
  pausedGames: IdlingGame[] = []
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
    colWidths: [38, 10, 12, 10],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const game of idlingGames) {
    table.push([
      game.name.length > 35 ? game.name.substring(0, 32) + '...' : game.name,
      getTotalPlaytime(game, false),
      chalk.green(formatGainedTime(game, false)),
      chalk.green('Idling'),
    ]);
  }

  for (const game of pausedGames) {
    table.push([
      chalk.gray(game.name.length > 35 ? game.name.substring(0, 32) + '...' : game.name),
      chalk.gray(getTotalPlaytime(game, true)),
      chalk.gray(formatGainedTime(game, true)),
      chalk.yellow('Paused'),
    ]);
  }

  console.log(table.toString());

  console.log(
    chalk.green(`\n  Idling ${chalk.bold(idlingGames.length)} game${idlingGames.length !== 1 ? 's' : ''}`) +
      (pausedGames.length > 0
        ? chalk.yellow(` (${pausedGames.length} paused - playing on Steam)`)
        : '') +
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
