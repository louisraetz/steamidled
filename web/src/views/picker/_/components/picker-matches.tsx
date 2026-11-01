import type { PickerResultsModel } from '../types/picker-results';
import type { PickerSheet } from '../types/picker-sheet';
import { PickerList } from './picker-list';
import { ResultsEmpty } from './results-empty';

export function PickerMatches({ results, sheet }: { results: PickerResultsModel; sheet: PickerSheet }) {
  if (results.empty) {
    return (
      <ResultsEmpty
        query={sheet.query}
        filter={sheet.filter}
        onClearSearch={() => sheet.changeQuery('')}
        onClearFilters={() => {
          sheet.changeQuery('');
          sheet.changeFilter('all');
        }}
      />
    );
  }
  return <PickerList results={results} listRef={sheet.listRef} />;
}
