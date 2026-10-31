import type { LibraryGame } from '@/lib/types';
import { useLibraryController } from '../hooks/use-library-controller';
import { LibraryResults } from './library-results';
import { LibraryToolbar } from './library-toolbar';
import { SelectionBar } from './selection-bar';
import { StopSelectionDialog } from './stop-selection-dialog';

export function LibraryContent({ games }: { games: LibraryGame[] }) {
  const controller = useLibraryController(games);
  return (
    <>
      <LibraryToolbar
        searchRef={controller.searchRef}
        query={controller.query}
        filter={controller.filter}
        total={games.length}
        onQueryChange={controller.changeQuery}
        onFilterChange={controller.changeFilter}
      />
      <div className="flex-1 pt-4 pb-6">
        <LibraryResults controller={controller} />
      </div>
      <SelectionBar
        selectedCount={controller.selection.selected.length}
        changes={controller.selection.changes}
        favoritesAvailable={controller.favoritesAvailable}
        actionsKind={controller.actionsKind}
        pending={controller.applyPending}
        disabled={controller.locked}
        onApply={controller.onApply}
        onDiscard={controller.onDiscard}
        onSelectFavorites={controller.onSelectFavorites}
      />
      <StopSelectionDialog {...controller.stopDialog} />
    </>
  );
}
