import type { LibraryController } from '../types/library-controller';
import { LibraryEmpty } from './library-empty';
import { LibraryList } from './library-list';

export function LibraryResults({ controller }: { controller: LibraryController }) {
  const { filtered } = controller;
  if (filtered.favorites.length + filtered.others.length === 0) {
    return (
      <LibraryEmpty
        query={controller.query}
        filter={controller.filter}
        onClearSearch={() => controller.changeQuery('')}
        onClearFilters={() => {
          controller.changeQuery('');
          controller.changeFilter('all');
        }}
      />
    );
  }
  return (
    <LibraryList
      favorites={filtered.favorites}
      others={filtered.others}
      selected={controller.selection.selectedSet}
      favoriteIds={controller.favoriteIds}
      exemptAppId={controller.exemptAppId}
      limitReached={controller.selection.limitReached}
      locked={controller.locked}
      onToggleSelect={controller.onToggleSelect}
      onToggleFavorite={controller.onToggleFavorite}
      onToggleExempt={controller.onToggleExempt}
    />
  );
}
