import { select, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { SteamGame, AuthMethod, GameSelection } from '../types/index.js';

// Displays authentication method selection prompt
export async function promptAuthMethod(hasStored: boolean): Promise<AuthMethod | 'stored'> {
  const choices: Array<{ name: string; value: AuthMethod | 'stored'; description: string }> = [];

  if (hasStored) {
    choices.push({
      name: 'Use saved login',
      value: 'stored',
      description: 'Login with your saved credentials',
    });
  }

  choices.push(
    {
      name: 'QR Code',
      value: 'qr',
      description: 'Scan QR code with Steam mobile app (recommended)',
    },
    {
      name: 'Username & Password',
      value: 'credentials',
      description: 'Login with your Steam credentials',
    }
  );

  return select({
    message: 'How would you like to login?',
    choices,
  });
}

// Displays checkbox-based game selection using inquirer
export async function promptGameSelection(
  games: SteamGame[],
  currentlySelected: GameSelection[] = []
): Promise<GameSelection[]> {
  const sortedGames = [...games].sort((a, b) => a.name.localeCompare(b.name));

  const selectedAppIds = new Set(currentlySelected.map((g) => g.appid));

  const choices = sortedGames.map((game) => ({
    name: `${game.name} ${chalk.gray(`(${formatPlaytime(game.playtime_forever)})`)}`,
    value: { appid: game.appid, name: game.name },
    checked: selectedAppIds.has(game.appid),
  }));

  console.log(chalk.cyan(`\nYou own ${games.length} games. Select games to idle (max 32):\n`));
  console.log(chalk.gray('Use arrow keys to navigate, space to select, enter to confirm\n'));

  const selected = await checkbox({
    message: 'Select games:',
    choices,
    pageSize: 15,
    loop: false,
    validate: (items) => {
      if (items.length === 0) {
        return 'Please select at least one game';
      }
      if (items.length > 32) {
        return 'Cannot select more than 32 games';
      }
      return true;
    },
  });

  return selected;
}

// Prompts for confirmation before clearing stored credentials
export async function promptConfirmLogout(): Promise<boolean> {
  return confirm({
    message: 'Do you want to clear saved login credentials?',
    default: false,
  });
}

// Prompts if user wants to select different games
export async function promptContinue(): Promise<boolean> {
  return confirm({
    message: 'Do you want to select different games?',
    default: false,
  });
}

// Formats playtime minutes for display in game selection
function formatPlaytime(minutes: number): string {
  if (minutes === 0) {
    return 'never played';
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 1) {
    return `${minutes}m`;
  }

  return `${hours.toLocaleString()}h`;
}
