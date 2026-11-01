import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RAIL_LABEL, SETTINGS_SECTIONS } from '../constants/sections';
import { RailSummary } from './rail-summary';

export function SettingsRail() {
  return (
    <TabsList variant="rail" aria-label={RAIL_LABEL}>
      {SETTINGS_SECTIONS.map((section) => (
        <TabsTrigger key={section.value} value={section.value}>
          <span>{section.label}</span>
          <RailSummary section={section.value} />
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
