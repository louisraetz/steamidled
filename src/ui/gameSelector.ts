import * as readline from 'node:readline';
import chalk from 'chalk';
import type { SteamGame, GameSelection, GameSource } from '../types/index.js';
import { loadFavorites, saveFavorites } from '../storage/favorites.js';

interface SelectableGame {
  appid: number;
  name: string;
  playtime: number;
  selected: boolean;
  isFavorite: boolean;
  source: GameSource;
}

type SourceFilter = 'all' | 'owned' | 'free' | 'shared';

const FILTER_CYCLE: SourceFilter[] = ['all', 'owned', 'free', 'shared'];

const SOURCE_BADGE: Record<GameSource, string> = {
  owned: '  ',
  free: chalk.green('$ '),
  shared: chalk.magenta('↪ '),
};

const FILTER_LABEL: Record<SourceFilter, string> = {
  all: 'all',
  owned: 'owned',
  free: 'free-to-play',
  shared: 'family shared',
};

interface GameSelectorResult {
  selectedGames: GameSelection[];
  quickStart: boolean; // true if user pressed Shift+Enter
}

// Interactive game selection with keyboard navigation and favorites support
export async function selectGames(
  games: SteamGame[],
  accountName: string,
  currentSelection: GameSelection[] = []
): Promise<GameSelectorResult> {
  const favorites = loadFavorites(accountName);
  const currentAppIds = new Set(currentSelection.map((g) => g.appid));

  // Create selectable games list
  const selectableGames: SelectableGame[] = games.map((game) => ({
    appid: game.appid,
    name: game.name,
    playtime: game.playtime_forever,
    selected: currentAppIds.has(game.appid) || favorites.includes(game.appid),
    isFavorite: favorites.includes(game.appid),
    source: game.source,
  }));

  // Sort: favorites first (alphabetically), then non-favorites (alphabetically)
  selectableGames.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  return new Promise((resolve) => {
    let cursorIndex = 0;
    let scrollOffset = 0;
    let sourceFilter: SourceFilter = 'all';
    const pageSize = 15;

    const matchesFilter = (g: SelectableGame): boolean =>
      sourceFilter === 'all' || g.source === sourceFilter;

    const getVisibleGames = (): SelectableGame[] => {
      const favoriteGames = selectableGames.filter((g) => g.isFavorite && matchesFilter(g));
      const nonFavoriteGames = selectableGames.filter((g) => !g.isFavorite && matchesFilter(g));
      return [...favoriteGames, ...nonFavoriteGames];
    };

    const sourceCounts = (): Record<GameSource, number> => {
      const counts: Record<GameSource, number> = { owned: 0, free: 0, shared: 0 };
      for (const g of selectableGames) counts[g.source]++;
      return counts;
    };

    const render = () => {
      console.clear();

      const filteredGames = getVisibleGames();
      const favoriteCount = filteredGames.filter((g) => g.isFavorite).length;

      console.log(chalk.cyan.bold('\n  Select Games to Idle\n'));

      // Count selections + source breakdown
      const selectedCount = selectableGames.filter((g) => g.selected).length;
      const counts = sourceCounts();
      console.log(
        chalk.gray(
          `  Selected: ${selectedCount}/32 | Favorites: ${favoriteCount} | ` +
            `Owned: ${counts.owned} ${chalk.green('$')} ${counts.free} ${chalk.magenta('↪')} ${counts.shared}`
        )
      );
      console.log(chalk.gray(`  Filter: ${chalk.cyan(FILTER_LABEL[sourceFilter])} (T to cycle)\n`));

      const visibleStart = scrollOffset;
      const visibleEnd = Math.min(scrollOffset + pageSize, filteredGames.length);
      const visibleGames = filteredGames.slice(visibleStart, visibleEnd);

      const favoritesEndIndex = favoriteCount;

      // Render favorites header if there are favorites and we're showing some
      if (favoriteCount > 0 && scrollOffset < favoritesEndIndex) {
        console.log(chalk.yellow.bold('  ★ FAVORITES\n'));
      }

      let displayIndex = visibleStart;
      for (const game of visibleGames) {
        if (displayIndex === favoritesEndIndex && favoriteCount > 0) {
          console.log('');
          console.log(chalk.gray.bold('  ALL GAMES\n'));
        }

        const isCurrent = displayIndex === cursorIndex;
        const checkbox = game.selected ? chalk.green('[✓]') : chalk.gray('[ ]');
        const star = game.isFavorite ? chalk.yellow('★ ') : '  ';
        const badge = SOURCE_BADGE[game.source];
        const playtime = formatPlaytime(game.playtime);
        const name =
          game.name.length > 40 ? game.name.substring(0, 37) + '...' : game.name;

        const line = `  ${checkbox} ${star}${badge}${name} ${chalk.gray(`(${playtime})`)}`;

        if (isCurrent) {
          console.log(chalk.bgGray.white(line));
        } else {
          console.log(line);
        }

        displayIndex++;
      }

      if (filteredGames.length === 0) {
        console.log(chalk.gray('  No games match the current filter.'));
      }

      // Scroll indicator
      if (filteredGames.length > pageSize) {
        const scrollInfo = `  ${visibleStart + 1}-${visibleEnd} of ${filteredGames.length}`;
        console.log(chalk.gray(`\n${scrollInfo}`));
      }

      // Instructions
      console.log('');
      console.log(chalk.gray('  ↑/↓: Navigate | Space: Toggle | F: Favorite | T: Filter'));
      console.log(chalk.gray('  Enter: Start | S: Start all favorites'));
      console.log('');
    };

    const handleKey = (str: string | undefined, key: readline.Key) => {
      const allGames = getVisibleGames();

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        if (cursorIndex > 0) {
          cursorIndex--;
          if (cursorIndex < scrollOffset) {
            scrollOffset = cursorIndex;
          }
        }
        render();
        return;
      }

      if (key.name === 'down') {
        if (cursorIndex < allGames.length - 1) {
          cursorIndex++;
          if (cursorIndex >= scrollOffset + pageSize) {
            scrollOffset = cursorIndex - pageSize + 1;
          }
        }
        render();
        return;
      }

      if (key.name === 'space') {
        const game = allGames[cursorIndex];
        if (game) {
          const selectedCount = selectableGames.filter((g) => g.selected).length;
          if (!game.selected && selectedCount >= 32) {
            return;
          }
          game.selected = !game.selected;
        }
        render();
        return;
      }

      if (str === 'f' || str === 'F') {
        const game = allGames[cursorIndex];
        if (game) {
          game.isFavorite = !game.isFavorite;

          // Update favorites in storage
          const newFavorites = selectableGames
            .filter((g) => g.isFavorite)
            .map((g) => g.appid);
          saveFavorites(accountName, newFavorites);

          selectableGames.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return a.name.localeCompare(b.name);
          });

          const visible = getVisibleGames();
          const newIndex = visible.findIndex((g) => g.appid === game.appid);
          cursorIndex = newIndex >= 0 ? newIndex : 0;

          if (cursorIndex < scrollOffset) {
            scrollOffset = cursorIndex;
          } else if (cursorIndex >= scrollOffset + pageSize) {
            scrollOffset = cursorIndex - pageSize + 1;
          }
        }
        render();
        return;
      }

      if (str === 't' || str === 'T') {
        const focusedAppId = allGames[cursorIndex]?.appid;
        const idx = FILTER_CYCLE.indexOf(sourceFilter);
        sourceFilter = FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length];

        const visible = getVisibleGames();
        const refoundIndex =
          focusedAppId !== undefined ? visible.findIndex((g) => g.appid === focusedAppId) : -1;
        cursorIndex = refoundIndex >= 0 ? refoundIndex : 0;
        scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, visible.length - pageSize)));
        if (cursorIndex < scrollOffset) {
          scrollOffset = cursorIndex;
        } else if (cursorIndex >= scrollOffset + pageSize) {
          scrollOffset = cursorIndex - pageSize + 1;
        }
        render();
        return;
      }

      if (str === 's' || str === 'S') {
        cleanup();
        const selectedGames = selectableGames
          .filter((g) => g.isFavorite)
          .map((g) => ({ appid: g.appid, name: g.name }));
        resolve({ selectedGames, quickStart: true });
        return;
      }

      if (key.name === 'return') {
        cleanup();
        const selectedGames = selectableGames
          .filter((g) => g.selected)
          .map((g) => ({ appid: g.appid, name: g.name }));
        resolve({ selectedGames, quickStart: false });
        return;
      }
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const keyHandler = (str: string | undefined, key: readline.Key) => {
      handleKey(str, key);
    };

    process.stdin.on('keypress', keyHandler);

    const cleanup = () => {
      process.stdin.removeListener('keypress', keyHandler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    };

    render();
  });
}

// Formats playtime minutes into a human-readable string
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
