import type { RefObject } from 'react';
import type { LibraryGame } from '@/lib/types';
import { ALL_GAMES_GROUP, AUTO_START_GROUP } from '../constants/picker';
import { rowTotal } from '../helpers/row-model';
import type { PickerResultsModel } from '../types/picker-results';
import { PickerGroup } from './picker-group';
import { PickerRow } from './picker-row';

interface PickerListProps {
  results: PickerResultsModel;
  listRef: RefObject<HTMLDivElement | null>;
}

export function PickerList({ results, listRef }: PickerListProps) {
  const { filtered, roving, draft } = results;

  const renderRow = (game: LibraryGame, index: number) => {
    const total = rowTotal(game);
    const added = draft.selectedSet.has(game.appid);
    return (
      <PickerRow
        key={game.appid}
        index={index}
        appid={game.appid}
        name={game.name}
        total={total.text}
        totalTitle={total.title}
        totalClassName={total.className}
        family={game.source === 'shared'}
        added={added}
        favorite={results.favoriteIds.has(game.appid)}
        exempt={results.exemptAppId === game.appid}
        disabled={draft.locked || (draft.full && !added)}
        favoriteLocked={results.preferencesLocked}
        focusable={index === roving.focusedIndex}
        onToggle={draft.toggle}
        onToggleFavorite={results.toggleFavorite}
        onFocusRow={roving.setFocusedIndex}
      />
    );
  };

  return (
    <div ref={listRef} onKeyDown={roving.onKeyDown} className="flex flex-col gap-4">
      <PickerGroup {...AUTO_START_GROUP} count={filtered.favorites.length}>
        {filtered.favorites.map((game, index) => renderRow(game, index))}
      </PickerGroup>
      <PickerGroup {...ALL_GAMES_GROUP} count={filtered.others.length}>
        {filtered.others.map((game, index) => renderRow(game, filtered.favorites.length + index))}
      </PickerGroup>
    </div>
  );
}
