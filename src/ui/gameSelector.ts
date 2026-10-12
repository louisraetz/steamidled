import * as readline from 'node:readline';
import chalk from 'chalk';
import type { SteamGame, GameSelection, GameSource, GameSelectorResult } from '../types/index.js';
import { loadFavorites, saveFavorites, loadExempt, saveExempt } from '../storage/favorites.js';
import { MAX_IDLE_GAMES } from '../constants.js';

interface SelectableGame {
  appid: number;
  name: string;
  playtime: number;
  selected: boolean;
  isFavorite: boolean;
  isExempt: boolean;
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

// Interactive game selection with keyboard navigation and favorites support
export async function selectGames(
  games: SteamGame[],
  accountName: string,
  currentSelection: GameSelection[] = []
): Promise<GameSelectorResult> {
  const favorites = loadFavorites(accountName);
  const initialExempt = loadExempt(accountName);
  const currentAppIds = new Set(currentSelection.map((g) => g.appid));
  // Edit mode (a current selection exists) must reflect exactly what is idling;
  // re-adding favorites would silently undo a deliberate deselection.
  const isEditMode = currentSelection.length > 0;

  // Create selectable games list
  const selectableGames: SelectableGame[] = games.map((game) => ({
    appid: game.appid,
    name: game.name,
    playtime: game.playtime_forever,
    selected: isEditMode ? currentAppIds.has(game.appid) : favorites.includes(game.appid),
    isFavorite: favorites.includes(game.appid),
    isExempt: initialExempt === game.appid,
    source: game.source,
  }));

  // Sort: favorites first (alphabetically), then non-favorites (alphabetically)
  selectableGames.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  // The preselection (current selection ∪ favorites) can exceed the cap when a
  // favorites file was hand-edited or predates the limit; keep the first 32 so
  // Enter never trips the gamesPlayed cap.
  let preselected = 0;
  for (const game of selectableGames) {
    if (!game.selected) continue;
    if (preselected >= MAX_IDLE_GAMES) game.selected = false;
    else preselected++;
  }

  return new Promise((resolve) => {
    let cursorIndex = 0;
    let scrollOffset = 0;
    let sourceFilter: SourceFilter = 'all';
    let searchQuery = '';
    let isSearchMode = false;
    let currentExempt: number | null = initialExempt;
    let hint = ''; // one-shot feedback line, cleared on the next key
    // Title, counters, section headers, scroll line, hint and key help take up
    // to ~20 rows; size the list so a default 24-row terminal keeps the
    // counters on screen.
    const pageSize = Math.min(30, Math.max(5, (process.stdout.rows || 24) - 20));

    const matchesQuery = (g: SelectableGame): boolean =>
      searchQuery.length === 0 ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = (g: SelectableGame): boolean =>
      (sourceFilter === 'all' || g.source === sourceFilter) && matchesQuery(g);

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
      const exemptGame = selectableGames.find((g) => g.isExempt);
      const exemptLabel = exemptGame
        ? exemptGame.name.length > 30
          ? exemptGame.name.substring(0, 27) + '...'
          : exemptGame.name
        : 'none';
      console.log(
        chalk.gray(
          `  Selected: ${selectedCount}/${MAX_IDLE_GAMES} | Favorites: ${favoriteCount} | ` +
            `Owned: ${counts.owned} ${chalk.green('$')} ${counts.free} ${chalk.magenta('↪')} ${counts.shared}`
        )
      );
      console.log(chalk.gray(`  Exempt: ${chalk.cyan(exemptLabel)} (X to toggle)`));
      console.log(chalk.gray(`  Filter: ${chalk.cyan(FILTER_LABEL[sourceFilter])} (T to cycle)`));
      if (isSearchMode) {
        console.log(chalk.cyan(`  Search: ${searchQuery}_`));
      } else if (searchQuery.length > 0) {
        console.log(chalk.gray(`  Search: ${chalk.cyan(searchQuery)} (/ to edit, Esc to clear)`));
      }
      if (hint) console.log(chalk.yellow(`  ${hint}`));
      console.log('');

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
        const exemptMark = game.isExempt ? chalk.cyan('∞ ') : '  ';
        const badge = SOURCE_BADGE[game.source];
        const playtime = formatPlaytime(game.playtime);
        const name =
          game.name.length > 40 ? game.name.substring(0, 37) + '...' : game.name;

        const line = `  ${checkbox} ${star}${exemptMark}${badge}${name} ${chalk.gray(`(${playtime})`)}`;

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
      if (isSearchMode) {
        console.log(chalk.gray('  Type to filter | Backspace: delete | Esc: cancel | Enter: confirm'));
      } else {
        console.log(chalk.gray('  ↑/↓ PgUp/PgDn Home/End: Navigate | Space: Toggle | F: Favorite | X: Exempt | T: Filter | /: Search'));
        console.log(
          chalk.gray(
            isEditMode
              ? '  Enter: Apply | S: Idle all favorites | Esc: Back (keep selection; F/X already saved)'
              : '  Enter: Start | S: Start all favorites'
          )
        );
      }
      console.log('');
    };

    const handleKey = (str: string | undefined, key: readline.Key) => {
      const allGames = getVisibleGames();
      hint = '';

      // Hand the abort back to the caller so it can log off cleanly instead of
      // exiting mid-session.
      if (key.ctrl && key.name === 'c') {
        cleanup();
        resolve({ selectedGames: [], exemptAppId: currentExempt, aborted: true });
        return;
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

      if (key.name === 'pageup' || key.name === 'pagedown' || key.name === 'home' || key.name === 'end') {
        const last = Math.max(0, allGames.length - 1);
        if (key.name === 'home') cursorIndex = 0;
        else if (key.name === 'end') cursorIndex = last;
        else if (key.name === 'pageup') cursorIndex = Math.max(0, cursorIndex - pageSize);
        else cursorIndex = Math.min(last, cursorIndex + pageSize);
        if (cursorIndex < scrollOffset) scrollOffset = cursorIndex;
        else if (cursorIndex >= scrollOffset + pageSize) scrollOffset = cursorIndex - pageSize + 1;
        render();
        return;
      }

      if (isSearchMode) {
        if (key.name === 'return') {
          isSearchMode = false;
          render();
          return;
        }
        if (key.name === 'escape') {
          isSearchMode = false;
          searchQuery = '';
          cursorIndex = 0;
          scrollOffset = 0;
          render();
          return;
        }
        if (key.name === 'backspace') {
          if (searchQuery.length > 0) {
            searchQuery = searchQuery.slice(0, -1);
            cursorIndex = 0;
            scrollOffset = 0;
          }
          render();
          return;
        }
        if (str && str.length === 1 && !key.ctrl && !key.meta && str.charCodeAt(0) >= 32) {
          searchQuery += str;
          cursorIndex = 0;
          scrollOffset = 0;
          render();
          return;
        }
        return;
      }

      if (str === '/') {
        isSearchMode = true;
        render();
        return;
      }

      if (key.name === 'escape') {
        if (searchQuery.length > 0) {
          searchQuery = '';
          cursorIndex = 0;
          scrollOffset = 0;
          render();
          return;
        }
        // Edit mode: leave the selection exactly as it is idling now
        if (isEditMode) {
          cleanup();
          resolve({ selectedGames: currentSelection, exemptAppId: currentExempt });
        }
        return;
      }

      if (key.name === 'space') {
        const game = allGames[cursorIndex];
        if (game) {
          const selectedCount = selectableGames.filter((g) => g.selected).length;
          if (!game.selected && selectedCount >= MAX_IDLE_GAMES) {
            hint = `Steam allows at most ${MAX_IDLE_GAMES} games at once`;
            render();
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
          const favoriteTotal = selectableGames.filter((g) => g.isFavorite).length;
          if (!game.isFavorite && favoriteTotal >= MAX_IDLE_GAMES) {
            hint = `Favorites are capped at ${MAX_IDLE_GAMES} (headless idles all of them)`;
            render();
            return;
          }
          game.isFavorite = !game.isFavorite;

          // Update favorites in storage
          const newFavorites = selectableGames
            .filter((g) => g.isFavorite)
            .map((g) => g.appid);
          if (!saveFavorites(accountName, newFavorites)) {
            hint = 'Could not save favorites — is ~/.steam-idler writable?';
          }

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

      if (str === 'x' || str === 'X') {
        const game = allGames[cursorIndex];
        if (game) {
          if (game.isExempt) {
            game.isExempt = false;
            currentExempt = null;
          } else {
            for (const g of selectableGames) g.isExempt = false;
            game.isExempt = true;
            currentExempt = game.appid;
          }
          if (!saveExempt(accountName, currentExempt)) {
            hint = 'Could not save exempt game — is ~/.steam-idler writable?';
          }
        }
        render();
        return;
      }

      if (str === 's' || str === 'S') {
        const selectedGames = selectableGames
          .filter((g) => g.isFavorite)
          .slice(0, MAX_IDLE_GAMES)
          .map((g) => ({ appid: g.appid, name: g.name }));
        if (selectedGames.length === 0) {
          hint = 'No favorites yet — press F on a game first';
          render();
          return;
        }
        cleanup();
        resolve({ selectedGames, exemptAppId: currentExempt });
        return;
      }

      if (key.name === 'return') {
        const selectedGames = selectableGames
          .filter((g) => g.selected)
          .map((g) => ({ appid: g.appid, name: g.name }));
        if (selectedGames.length === 0) {
          hint = 'Nothing selected — Space toggles a game, S starts your favorites';
          render();
          return;
        }
        cleanup();
        resolve({ selectedGames, exemptAppId: currentExempt });
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
