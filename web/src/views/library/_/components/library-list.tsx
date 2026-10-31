import type { LibraryGame } from '@/lib/types';
import { rowTotal } from '../helpers/row-model';
import { useRovingList } from '../hooks/use-roving-list';
import { LibraryGroup } from './library-group';
import { LibraryRow } from './library-row';

interface LibraryListProps {
  favorites: LibraryGame[];
  others: LibraryGame[];
  selected: ReadonlySet<number>;
  favoriteIds: ReadonlySet<number>;
  exemptAppId: number | null;
  limitReached: boolean;
  locked: boolean;
  onToggleSelect: (appid: number) => void;
  onToggleFavorite: (appid: number) => void;
  onToggleExempt: (appid: number) => void;
}

export function LibraryList(props: LibraryListProps) {
  const ordered = [...props.favorites, ...props.others];
  const roving = useRovingList({
    count: ordered.length,
    onSelect: (index) => props.onToggleSelect(ordered[index].appid),
    onFavorite: (index) => props.onToggleFavorite(ordered[index].appid),
    onExempt: (index) => props.onToggleExempt(ordered[index].appid),
  });

  const renderRow = (game: LibraryGame, index: number) => {
    const total = rowTotal(game);
    const selected = props.selected.has(game.appid);
    return (
      <LibraryRow
        key={game.appid}
        index={index}
        appid={game.appid}
        name={game.name}
        total={total.text}
        totalTitle={total.title}
        totalClassName={total.className}
        family={game.source === 'shared'}
        selected={selected}
        favorite={props.favoriteIds.has(game.appid)}
        exempt={props.exemptAppId === game.appid}
        selectDisabled={props.limitReached && !selected}
        locked={props.locked}
        focusable={index === roving.focusedIndex}
        onToggleSelect={props.onToggleSelect}
        onToggleFavorite={props.onToggleFavorite}
        onToggleExempt={props.onToggleExempt}
        onFocusRow={roving.setFocusedIndex}
      />
    );
  };

  return (
    <div ref={roving.listRef} onKeyDown={roving.onKeyDown} className="flex flex-col gap-4">
      <LibraryGroup title="Favorites" count={props.favorites.length}>
        {props.favorites.map((game, index) => renderRow(game, index))}
      </LibraryGroup>
      <LibraryGroup title="All games" count={props.others.length}>
        {props.others.map((game, index) => renderRow(game, props.favorites.length + index))}
      </LibraryGroup>
    </div>
  );
}
