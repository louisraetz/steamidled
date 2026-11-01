import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { useHotkey } from '@/hooks/use-hotkey';
import { SEARCH_ID } from '../constants/picker';
import { searchPlaceholder } from '../helpers/search-placeholder';
import type { PickerSheet } from '../types/picker-sheet';

export function PickerSearch({ sheet, total }: { sheet: PickerSheet; total: number }) {
  useHotkey('/', () => sheet.searchRef.current?.focus());

  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        ref={sheet.searchRef}
        id={SEARCH_ID}
        name="q"
        type="search"
        aria-label="Search games"
        placeholder={searchPlaceholder(total)}
        value={sheet.query}
        onChange={(event) => sheet.changeQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          sheet.focusList();
        }}
      />
      <InputGroupAddon align="inline-end" className="hidden sm:flex">
        <Kbd>/</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}
