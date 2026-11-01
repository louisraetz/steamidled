import type { LibraryGame } from '@/lib/types';
import { usePickerResults } from '../hooks/use-picker-results';
import type { PickerSheet } from '../types/picker-sheet';
import { PickerMatches } from './picker-matches';
import { PickerNotice } from './picker-notice';

export function PickerResults({ games, sheet }: { games: LibraryGame[]; sheet: PickerSheet }) {
  const results = usePickerResults(games, sheet);
  return (
    <>
      <PickerNotice kind={results.notice} />
      <PickerMatches results={results} sheet={sheet} />
    </>
  );
}
