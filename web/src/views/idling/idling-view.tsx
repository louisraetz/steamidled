import { Page } from '@/components/page';
import { GamePicker } from '@/views/picker/game-picker';
import { IdlingContent } from './_/components/idling-content';
import { StateAlert } from './_/components/state-alert';

export function IdlingView() {
  return (
    <Page>
      <div className="flex flex-col gap-6">
        <StateAlert />
        <IdlingContent />
      </div>
      <GamePicker />
    </Page>
  );
}
