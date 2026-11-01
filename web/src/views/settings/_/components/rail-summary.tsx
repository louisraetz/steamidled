import { RichText } from '@/components/rich-text';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { railSummary } from '../helpers/rail-summary';
import type { SettingsSectionKey } from '../types/settings-section';

export function RailSummary({ section }: { section: SettingsSectionKey }) {
  const parts = useDaemonState((snapshot) => railSummary(section, snapshot)) ?? [];
  return (
    <span className="hidden max-w-full truncate text-sm font-normal text-tertiary lg:block">
      <RichText parts={parts} />
    </span>
  );
}
